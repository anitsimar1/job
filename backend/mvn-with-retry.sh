#!/usr/bin/env bash
set -uo pipefail

MAX_ATTEMPTS="${MVN_MAX_ATTEMPTS:-5}"
BACKOFF_SECONDS=(10 20 35 50)
LOG_FILE="$(mktemp)"
SETTINGS_FILE="$(mktemp)"

cleanup() {
  rm -f "${LOG_FILE}" "${SETTINGS_FILE}"
}
trap cleanup EXIT

write_mirror_settings() {
  local mirror_url="$1"
  cat > "${SETTINGS_FILE}" <<EOF
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">
  <mirrors>
    <mirror>
      <id>central-public-mirror</id>
      <name>Public Maven Central Mirror</name>
      <url>${mirror_url}</url>
      <mirrorOf>central</mirrorOf>
    </mirror>
  </mirrors>
</settings>
EOF
}

is_transient_error() {
  grep -qiE \
    'status code: (429|500|502|503|504)|Too Many Requests|Service Unavailable|Bad Gateway|Gateway Timeout|Connection reset|Read timed out|Connect timed out|Remote host terminated the handshake|Could not transfer artifact' \
    "${LOG_FILE}"
}

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
  extra_args=(
    "-B"
    "-Dmaven.artifact.threads=2"
    "-Daether.connector.basic.threads=2"
    "-Daether.connector.connectTimeout=15000"
    "-Daether.connector.requestTimeout=120000"
  )

  # Attempt 1 & 4 use Maven Central directly; attempts 2, 3, 5 fall back to free public Central mirrors
  case "${attempt}" in
    2|5)
      write_mirror_settings "https://maven-central.storage-download.googleapis.com/maven2"
      extra_args+=("-s" "${SETTINGS_FILE}")
      echo "[mvn-retry] Attempt ${attempt}/${MAX_ATTEMPTS} using public Maven Central mirror (US)..."
      ;;
    3)
      write_mirror_settings "https://maven-central-eu.storage-download.googleapis.com/maven2"
      extra_args+=("-s" "${SETTINGS_FILE}")
      echo "[mvn-retry] Attempt ${attempt}/${MAX_ATTEMPTS} using public Maven Central mirror (EU)..."
      ;;
    *)
      echo "[mvn-retry] Attempt ${attempt}/${MAX_ATTEMPTS} using Maven Central..."
      ;;
  esac

  mvn "${extra_args[@]}" "$@" 2>&1 | tee "${LOG_FILE}"
  exit_code="${PIPESTATUS[0]}"

  if (( exit_code == 0 )); then
    exit 0
  fi

  if (( attempt == MAX_ATTEMPTS )); then
    echo "[mvn-retry] Maven failed after ${MAX_ATTEMPTS} attempts (exit code ${exit_code})." >&2
    exit "${exit_code}"
  fi

  if ! is_transient_error; then
    echo "[mvn-retry] Non-transient Maven failure detected; aborting without retry (exit code ${exit_code})." >&2
    exit "${exit_code}"
  fi

  # Clear .lastUpdated markers so Maven re-attempts failed artifact downloads cleanly
  if [[ -d "${HOME}/.m2/repository" ]]; then
    find "${HOME}/.m2/repository" -name "*.lastUpdated" -delete 2>/dev/null || true
  fi

  delay="${BACKOFF_SECONDS[$((attempt - 1))]:-60}"
  echo "[mvn-retry] Transient Maven download error (429/5xx/network). Retrying in ${delay}s..." >&2
  sleep "${delay}"
  attempt=$((attempt + 1))
done

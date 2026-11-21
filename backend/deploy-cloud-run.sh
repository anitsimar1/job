#!/usr/bin/env bash
set -euo pipefail

# Deploy JobConnect Spring Boot backend to Google Cloud Run + Cloud SQL (MySQL 8)
# Run from Google Cloud Shell or a local machine with gcloud authenticated.

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-asia-northeast1}"
SERVICE_NAME="${SERVICE_NAME:-jobconnect-backend}"
SQL_INSTANCE="${SQL_INSTANCE:-jobconnect-mysql}"
DB_NAME="${DB_NAME:-jobconnect}"
DB_USER="${DB_USER:-jobconnect_app}"

DEV_FRONTEND_URL="${DEV_FRONTEND_URL:-https://ais-dev-gipkcu5tiwi55u7jym4mob-898921356034.asia-northeast1.run.app}"
SHARED_FRONTEND_URL="${SHARED_FRONTEND_URL:-https://ais-pre-gipkcu5tiwi55u7jym4mob-898921356034.asia-northeast1.run.app}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: Set PROJECT_ID or run 'gcloud config set project YOUR_PROJECT_ID'." >&2
  exit 1
fi

for required_var in DB_PASSWORD GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Error: ${required_var} environment variable must be set before running this script." >&2
    exit 1
  fi
done

JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"

echo "==> Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "${PROJECT_ID}"

if ! gcloud sql instances describe "${SQL_INSTANCE}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "==> Creating Cloud SQL MySQL 8.0 instance (${SQL_INSTANCE})..."
  gcloud sql instances create "${SQL_INSTANCE}" \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --project="${PROJECT_ID}"
fi

gcloud sql databases create "${DB_NAME}" \
  --instance="${SQL_INSTANCE}" \
  --project="${PROJECT_ID}" >/dev/null 2>&1 || true

if ! gcloud sql users list --instance="${SQL_INSTANCE}" --project="${PROJECT_ID}" --format='value(name)' | grep -qx "${DB_USER}"; then
  gcloud sql users create "${DB_USER}" \
    --instance="${SQL_INSTANCE}" \
    --password="${DB_PASSWORD}" \
    --project="${PROJECT_ID}"
else
  gcloud sql users set-password "${DB_USER}" \
    --instance="${SQL_INSTANCE}" \
    --password="${DB_PASSWORD}" \
    --project="${PROJECT_ID}"
fi

upsert_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "${name}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=- --project "${PROJECT_ID}"
  else
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=- --project "${PROJECT_ID}"
  fi
}

echo "==> Storing runtime secrets in Secret Manager..."
upsert_secret "jobconnect-db-password" "${DB_PASSWORD}"
upsert_secret "jobconnect-jwt-secret" "${JWT_SECRET}"
upsert_secret "jobconnect-google-client-id" "${GOOGLE_CLIENT_ID}"
upsert_secret "jobconnect-google-client-secret" "${GOOGLE_CLIENT_SECRET}"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "==> Granting Secret Manager & Cloud SQL access to ${RUNTIME_SA}..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/cloudsql.client" \
  --quiet >/dev/null

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
JDBC_URL="jdbc:mysql:///${DB_NAME}?cloudSqlInstance=${CONNECTION_NAME}&socketFactory=com.google.cloud.sql.mysql.SocketFactory&createDatabaseIfNotExist=true&serverTimezone=UTC"
CORS_ORIGINS="${DEV_FRONTEND_URL},${SHARED_FRONTEND_URL},http://localhost:5173,http://localhost:3000"
OAUTH_REDIRECT_TARGET="${DEV_FRONTEND_URL}/oauth/callback"

echo "==> Deploying ${SERVICE_NAME} to Cloud Run (${REGION})..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
gcloud run deploy "${SERVICE_NAME}" \
  --source "${SCRIPT_DIR}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --add-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "^@^SPRING_PROFILES_ACTIVE=prod@DB_USERNAME=${DB_USER}@DB_URL=${JDBC_URL}@APP_CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}@APP_FRONTEND_AUTH_REDIRECT_URI=${OAUTH_REDIRECT_TARGET}" \
  --set-secrets "DB_PASSWORD=jobconnect-db-password:latest,JWT_SECRET=jobconnect-jwt-secret:latest,GOOGLE_CLIENT_ID=jobconnect-google-client-id:latest,GOOGLE_CLIENT_SECRET=jobconnect-google-client-secret:latest"

BACKEND_URL="$(gcloud run services describe "${SERVICE_NAME}" --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"

echo ""
echo "============================================================"
echo "Backend deployed: ${BACKEND_URL}"
echo "Health check:     ${BACKEND_URL}/api/health"
echo ""
echo "1) Add this Authorized Redirect URI in Google Cloud Console:"
echo "   ${BACKEND_URL}/login/oauth2/code/google"
echo ""
echo "2) Set in your React frontend environment:"
echo "   VITE_API_BASE_URL=${BACKEND_URL}/api"
echo "   VITE_API_FALLBACK_TO_MOCK=false"
echo "============================================================"

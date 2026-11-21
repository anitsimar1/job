#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap script for JobConnect automated deployment on Google Cloud:
# - Enables GCP APIs (Cloud Run, Cloud SQL, Cloud Build, Artifact Registry, Secret Manager, IAM)
# - Creates Artifact Registry repository
# - Provisions Cloud SQL MySQL 8.0 instance, database, and app user
# - Stores secrets in Secret Manager (no hardcoded credentials)
# - Creates least-privilege Cloud Run runtime SA & GitHub Actions Workload Identity Federation

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-asia-northeast1}"
AR_REPO="${AR_REPO:-jobconnect}"
SQL_INSTANCE="${SQL_INSTANCE:-jobconnect-mysql}"
DB_NAME="${DB_NAME:-jobconnect}"
DB_USER="${DB_USER:-jobconnect_app}"
RUNTIME_SA="${RUNTIME_SA:-jobconnect-backend-sa}"
DEPLOYER_SA="${DEPLOYER_SA:-jobconnect-github-deployer}"
WIF_POOL="${WIF_POOL:-github-actions-pool}"
WIF_PROVIDER="${WIF_PROVIDER:-github-oidc}"
GITHUB_REPO="${GITHUB_REPO:-}" # e.g. my-org/jobconnect

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: Set PROJECT_ID or run 'gcloud config set project YOUR_PROJECT_ID'." >&2
  exit 1
fi

if [[ -z "${GITHUB_REPO}" ]]; then
  echo "Error: Set GITHUB_REPO (format: owner/repo-name) for Workload Identity Federation." >&2
  exit 1
fi

for required_var in DB_PASSWORD GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Error: ${required_var} environment variable must be set." >&2
    exit 1
  fi
done

JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"

echo "==> 1/7 Enabling Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  --project "${PROJECT_ID}"

echo "==> 2/7 Creating Artifact Registry repository (${AR_REPO})..."
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="JobConnect Docker images" \
    --project="${PROJECT_ID}"
fi

echo "==> 3/7 Provisioning Cloud SQL MySQL 8.0 (${SQL_INSTANCE})..."
if ! gcloud sql instances describe "${SQL_INSTANCE}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud sql instances create "${SQL_INSTANCE}" \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --project="${PROJECT_ID}"
fi

gcloud sql databases create "${DB_NAME}" --instance="${SQL_INSTANCE}" --project="${PROJECT_ID}" >/dev/null 2>&1 || true

if ! gcloud sql users list --instance="${SQL_INSTANCE}" --project="${PROJECT_ID}" --format='value(name)' | grep -qx "${DB_USER}"; then
  gcloud sql users create "${DB_USER}" --instance="${SQL_INSTANCE}" --password="${DB_PASSWORD}" --project="${PROJECT_ID}"
else
  gcloud sql users set-password "${DB_USER}" --instance="${SQL_INSTANCE}" --password="${DB_PASSWORD}" --project="${PROJECT_ID}"
fi

upsert_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "${name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=- --project="${PROJECT_ID}"
  else
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=- --project="${PROJECT_ID}"
  fi
}

echo "==> 4/7 Storing secrets in Secret Manager..."
upsert_secret "jobconnect-db-password" "${DB_PASSWORD}"
upsert_secret "jobconnect-jwt-secret" "${JWT_SECRET}"
upsert_secret "jobconnect-google-client-id" "${GOOGLE_CLIENT_ID}"
upsert_secret "jobconnect-google-client-secret" "${GOOGLE_CLIENT_SECRET}"

echo "==> 5/7 Configuring IAM for Cloud Run runtime & Cloud Build..."
RUNTIME_SA_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${RUNTIME_SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${RUNTIME_SA}" \
    --display-name="JobConnect Cloud Run Backend Runtime" \
    --project="${PROJECT_ID}"
fi

for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="${role}" \
    --quiet >/dev/null
done

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
for cb_sa in "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"; do
  for role in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer roles/logging.logWriter; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${cb_sa}" \
      --role="${role}" \
      --quiet >/dev/null || true
  done
done

echo "==> 6/7 Configuring GitHub Actions deployer SA & Workload Identity Federation..."
DEPLOYER_SA_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${DEPLOYER_SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${DEPLOYER_SA}" \
    --display-name="JobConnect GitHub Actions Deployer" \
    --project="${PROJECT_ID}"
fi

for role in roles/cloudbuild.builds.editor roles/run.viewer roles/storage.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
    --role="${role}" \
    --quiet >/dev/null
done

if ! gcloud iam workload-identity-pools describe "${WIF_POOL}" --location="global" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${WIF_POOL}" \
    --location="global" \
    --display-name="GitHub Actions Pool" \
    --project="${PROJECT_ID}"
fi

if ! gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER}" \
  --location="global" --workload-identity-pool="${WIF_POOL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
    --location="global" \
    --workload-identity-pool="${WIF_POOL}" \
    --display-name="GitHub OIDC Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --project="${PROJECT_ID}"
fi

gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null

WIF_PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

echo "==> 7/7 Bootstrap complete!"
echo ""
echo "Add these GitHub Repository Secrets (Settings -> Secrets and variables -> Actions):"
echo "  GCP_PROJECT_ID=${PROJECT_ID}"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER=${WIF_PROVIDER_RESOURCE}"
echo "  GCP_DEPLOYER_SA=${DEPLOYER_SA_EMAIL}"
echo ""
echo "Optional GitHub Repository Variables:"
echo "  GCP_REGION=${REGION}"
echo "  GCP_AR_REPO=${AR_REPO}"
echo "  GCP_SQL_INSTANCE=${SQL_INSTANCE}"

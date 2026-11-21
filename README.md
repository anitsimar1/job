# JobConnect – Full-Stack Job Portal

JobConnect is a full-stack executive & technical job portal built with **React 19 + TypeScript + Vite + Tailwind CSS + Axios** on the frontend and **Java 17 + Spring Boot 3.x + Spring Security + JWT (HttpOnly cookies) + Spring Data JPA + Flyway + MySQL 8** on the backend.

---

## Project Structure

```text
jobconnect/
├── src/                        # React + TypeScript + Vite frontend (9 Stitch screens)
│   ├── components/             # Layout shells, ProtectedRoute, modals, job cards
│   ├── context/                # AppContext state & backend hydration
│   ├── pages/                  # All 9 application screens
│   ├── services/               # Axios apiClient + auth, job, application, user, resume, admin services
│   └── types/                  # Shared TypeScript interfaces & DTOs
├── public/                     # Static assets
├── backend/                    # Java 17 Spring Boot 3 REST API
│   ├── src/main/java/com/jobconnect/
│   │   ├── config/             # SecurityConfig, CORS, JWT properties
│   │   ├── controller/         # REST controllers (/api/auth, /api/jobs, /api/applications, /api/users, /api/resumes, /api/admin)
│   │   ├── dto/                # Request/Response DTOs with Bean Validation
│   │   ├── entity/             # JPA entities (User, AuthProvider, Role, Job, Application, Resume, SavedJob, RevokedToken)
│   │   ├── exception/          # GlobalExceptionHandler & custom exceptions
│   │   ├── repository/         # Spring Data JPA repositories & Specifications
│   │   ├── security/           # JwtTokenProvider, JwtAuthenticationFilter, HttpCookieOAuth2AuthorizationRequestRepository, OAuth2 handlers
│   │   └── service/            # Business logic, ownership checks, file validation
│   ├── src/main/resources/
│   │   ├── db/migration/       # Flyway SQL migrations (V1, V2, V3__google_oauth_and_schema_alignment.sql)
│   │   ├── application.properties
│   │   └── application-prod.properties
│   ├── src/test/               # JUnit 5 + Mockito + MockMvc security & service tests
│   ├── Dockerfile              # Multi-stage Java 17 Cloud Run container build
│   ├── .dockerignore
│   ├── .env.example
│   └── pom.xml
├── .env.example
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Java JDK** 17+
- **Apache Maven** 3.9+
- **MySQL** 8.0+

---

## 1. Database Setup (MySQL 8)

Create the database (or allow `createDatabaseIfNotExist=true` in JDBC URL) and a dedicated MySQL user:

```sql
CREATE DATABASE IF NOT EXISTS jobconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Flyway automatically runs `V1__init_schema.sql`, `V2__seed_roles_and_jobs.sql`, and `V3__google_oauth_and_schema_alignment.sql` on application startup—creating tables (`roles`, `users`, `user_roles`, `jobs`, `job_skills`, `resumes`, `applications`, `saved_jobs`, `revoked_tokens`), aligning MySQL `DATETIME(6)` timestamps with Hibernate 6 `Instant`, adding Google OAuth identity columns (`auth_provider`, `google_sub`, `email_verified`), seeding `ROLE_JOB_SEEKER` and `ROLE_ADMIN`, and loading initial verified job listings.

---

## 2. Backend Setup (Spring Boot)

1. Navigate to the backend directory and configure environment variables (`application.properties` automatically imports `backend/.env` when present):

```bash
cd backend
cp .env.example .env
```

2. Edit `backend/.env` (or export environment variables — never commit real credentials):

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=jobconnect
export DB_USERNAME=your_mysql_username
export DB_PASSWORD=your_mysql_password
export JWT_SECRET=$(openssl rand -base64 48)
export GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=your-google-client-secret
export APP_FRONTEND_AUTH_REDIRECT_URI=http://localhost:5173/oauth/callback
export APP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
export APP_UPLOAD_DIR=./storage/resumes
```

3. Run the Spring Boot backend (listens on `http://localhost:8080`):

```bash
mvn spring-boot:run
```

4. Run the JUnit 5 + Mockito + Spring Security test suite (uses in-memory H2 in test profile):

```bash
mvn test
```

---

## 3. Frontend Setup (React + Vite)

1. From the project root, copy `.env.example` to `.env` and point `VITE_API_BASE_URL` to the Spring Boot API:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL="http://localhost:8080/api"
VITE_API_FALLBACK_TO_MOCK="false"
```

> **Preview / Mock Mode:** When `VITE_API_BASE_URL` is empty (`""`), the frontend automatically operates in UI Preview Mode using local mock data so all 9 screens can be explored standalone without a running backend.

2. Install dependencies and start the Vite development server on port `3000`:

```bash
npm install
npm run dev
```

3. Build for production:

```bash
npm run build
```

---

## 4. Security & Admin Access

- **Password Hashing:** BCrypt via `BCryptPasswordEncoder`.
- **JWT Cookie Auth:** Login and registration issue a signed JWT stored in an `HttpOnly`, `SameSite=Lax` cookie (`jobconnect_jwt`). Logout clears the cookie and records the token JTI in `revoked_tokens`.
- **Default Role Enforcement:** `POST /api/auth/register` validates email, password strength, matching `confirmPassword`, and phone number, prevents duplicate emails, and strictly assigns `ROLE_JOB_SEEKER`.
- **Creating an Admin Account:** Public registration cannot assign `ROLE_ADMIN`. Register a user via the UI or `/api/auth/register`, then promote them in MySQL:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@yourdomain.com' AND r.name = 'ROLE_ADMIN';
```

- **File Uploads:** Resumes are validated for extension (`.pdf`, `.docx`), MIME/magic bytes, and 10MB max size, then stored outside the public webroot using UUID-prefixed filenames.

---

## 4b. Google OAuth 2.0 Setup (Local & Production)

JobConnect uses Spring Security OAuth2 Client Authorization Code Flow with stateless `HttpOnly` cookie storage (`jobconnect_oauth2_auth_req`) and issues an `HttpOnly` `jobconnect_jwt` session cookie after verifying Google's `sub`, `email`, and `email_verified=true` claims.

### Google Cloud Console Configuration
1. Open **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**:
   - Choose **External** (or Internal for Google Workspace) and add scopes `openid`, `email`, and `profile`.
2. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID** (**Web application**).
3. Configure **Authorized JavaScript origins**:
   - Local development: `http://localhost:5173`, `http://localhost:3000`, `http://localhost:8080`
   - Production: `https://yourdomain.com` (and `https://api.yourdomain.com` if API runs on a separate subdomain)
4. Configure **Authorized redirect URIs** (Spring Security's default callback endpoint):
   - Local development: `http://localhost:8080/login/oauth2/code/google`
   - Production: `https://api.yourdomain.com/login/oauth2/code/google`
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` or production secret manager.

### Production Profile (`SPRING_PROFILES_ACTIVE=prod`)
Run with `-Dspring-boot.run.profiles=prod` (or `SPRING_PROFILES_ACTIVE=prod`) to activate `application-prod.properties`, which enforces:
- Cloud Run `PORT` binding (`server.port=${PORT:${SERVER_PORT:8080}}`) & `server.forward-headers-strategy=framework`
- SSL MySQL JDBC or Cloud SQL Auth Proxy socket connection (`DB_URL` or `DB_HOST`)
- `Secure` `HttpOnly` cookies (`JWT_COOKIE_SECURE=true`, `JWT_COOKIE_SAME_SITE=None` for cross-origin HTTPS `*.run.app` domains, or `Lax` for same-origin reverse proxy)
- Writable container upload storage (`/tmp/jobconnect/resumes` by default)
- Strict environment variables (`DB_URL`/`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_AUTH_REDIRECT_URI`)

---

## 4c. Deploying Spring Boot Backend to Google Cloud Run

### 1. Provision Cloud SQL for MySQL 8 (or External TLS MySQL)
```bash
gcloud sql instances create jobconnect-mysql \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=asia-northeast1

gcloud sql databases create jobconnect --instance=jobconnect-mysql
gcloud sql users create jobconnect_app --instance=jobconnect-mysql --password="STRONG_DB_PASSWORD"
```

### 2. Store Secrets in Secret Manager
```bash
printf '%s' "STRONG_DB_PASSWORD" | gcloud secrets create jobconnect-db-password --data-file=-
openssl rand -base64 48 | tr -d '\n' | gcloud secrets create jobconnect-jwt-secret --data-file=-
printf '%s' "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets create jobconnect-google-client-id --data-file=-
printf '%s' "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets create jobconnect-google-client-secret --data-file=-
```

### 3. Build & Deploy `backend/` to Cloud Run
```bash
cd backend
gcloud run deploy jobconnect-backend \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --add-cloudsql-instances PROJECT_ID:asia-northeast1:jobconnect-mysql \
  --set-env-vars "SPRING_PROFILES_ACTIVE=prod,DB_USERNAME=jobconnect_app,DB_URL=jdbc:mysql:///jobconnect?cloudSqlInstance=PROJECT_ID:asia-northeast1:jobconnect-mysql&socketFactory=com.google.cloud.sql.mysql.SocketFactory&createDatabaseIfNotExist=true&serverTimezone=UTC,APP_CORS_ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN,APP_FRONTEND_AUTH_REDIRECT_URI=https://YOUR_FRONTEND_DOMAIN/oauth/callback" \
  --set-secrets "DB_PASSWORD=jobconnect-db-password:latest,JWT_SECRET=jobconnect-jwt-secret:latest,GOOGLE_CLIENT_ID=jobconnect-google-client-id:latest,GOOGLE_CLIENT_SECRET=jobconnect-google-client-secret:latest"
```

### 4. Configure Google Cloud Console OAuth Callback
Once Cloud Run outputs your `BACKEND_URL` (e.g., `https://jobconnect-backend-xxxx.a.run.app`):
- Add `BACKEND_URL` and `FRONTEND_URL` to **Authorized JavaScript origins**.
- Add `BACKEND_URL/login/oauth2/code/google` to **Authorized redirect URIs**.

### 5. Connect the React Frontend
Set `VITE_API_BASE_URL="https://YOUR_BACKEND_URL/api"` and `VITE_API_FALLBACK_TO_MOCK="false"` in your frontend build environment, then rebuild (`npm run build`).

---

## 4d. Automated One-Click CI/CD Deployment (AI Studio → GitHub → Cloud Build → Cloud Run)

This repository includes full Infrastructure & CI/CD automation so you never need to upload ZIPs manually:

- `/Dockerfile` & `/nginx.conf.template` — Production React + Vite SPA container on Cloud Run
- `/backend/Dockerfile` — Production Spring Boot Java 17 container on Cloud Run
- `/cloudbuild.yaml` — Builds both images into Artifact Registry, deploys backend + frontend to Cloud Run, and automatically wires `VITE_API_BASE_URL`, `APP_CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_AUTH_REDIRECT_URI`, and `GOOGLE_REDIRECT_URI`
- `/scripts/bootstrap-gcp.sh` — One-time setup for GCP APIs, Artifact Registry, Cloud SQL MySQL 8, Secret Manager, IAM roles, and keyless GitHub Workload Identity Federation
- `/.github/workflows/deploy-gcp.yml` — Runs `mvn test`, `npm run lint`, and `npm run build`, then triggers Cloud Build on every push to `main` or via GitHub Actions **Run workflow**

### One-Time Setup
1. Sync/save your AI Studio project directly to a GitHub repository.
2. Run `./scripts/bootstrap-gcp.sh` once (with `PROJECT_ID`, `GITHUB_REPO`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` set).
3. Add the printed `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, and `GCP_DEPLOYER_SA` values as GitHub Repository Secrets.
4. Trigger **Deploy JobConnect to Google Cloud Run** in GitHub Actions (or push to `main`), then copy the printed `BACKEND_URL/login/oauth2/code/google` into Google Cloud Console OAuth Redirect URIs.

---

## 5. REST API Endpoints

### Health & Authentication
- `GET /api/health` — Public Cloud Run readiness / health check
- `POST /api/auth/register` — Register new job seeker account
- `POST /api/auth/login` — Authenticate and set HttpOnly JWT cookie
- `POST /api/auth/logout` — Revoke JWT token and clear cookie
- `GET /api/auth/me` — Retrieve authenticated user profile & roles

### Jobs
- `GET /api/jobs` — Paginated list of open jobs
- `GET /api/jobs/{id}` — Retrieve single job details
- `GET /api/jobs/search` — Search & filter jobs (`q`, `location`, `sector`, `workplace`, `employmentType`, `experience`, `minSalaryK`, `page`, `size`, `sortBy`, `direction`)
- `POST /api/jobs` — Create job (`ADMIN` only)
- `PUT /api/jobs/{id}` — Update job (`ADMIN` only)
- `DELETE /api/jobs/{id}` — Delete job (`ADMIN` only)
- `POST /api/jobs/{id}/bookmark` & `DELETE /api/jobs/{id}/bookmark` — Save/unsave job

### Applications
- `POST /api/applications` — Submit job application (duplicate prevention enforced)
- `GET /api/applications/my` — List current user's applications
- `GET /api/applications/{id}` — Get application details (owner or `ADMIN`)
- `DELETE /api/applications/{id}` — Withdraw application (owner)

### User Profile & Resumes
- `GET /api/users/profile` — Get current user's profile
- `PUT /api/users/profile` — Update current user's profile
- `POST /api/resumes/upload` — Upload PDF/DOCX resume
- `GET /api/resumes/my` — List current user's resumes
- `GET /api/resumes/{id}/download` — Download resume (owner or `ADMIN`)
- `PATCH /api/resumes/{id}/default` — Set default resume
- `DELETE /api/resumes/{id}` — Delete resume (owner)

### Admin Console (`ROLE_ADMIN` required)
- `GET /api/admin/metrics` — Platform recruitment metrics
- `GET /api/admin/users` — List registered users
- `GET /api/admin/applications` — Paginated list of all applications
- `PUT /api/admin/applications/{id}/status` — Update application status (`APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `REJECTED`, `HIRED`)

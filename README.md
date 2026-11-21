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
│   ├── Dockerfile              # Multi-stage Java 17 Render / Docker build
│   ├── .dockerignore
│   ├── .env.example
│   └── pom.xml
├── .github/workflows/
│   ├── deploy-frontend-vercel.yml
│   └── deploy-backend-render.yml
├── vercel.json                 # Vercel SPA rewrites & Vite build config
├── render.yaml                 # Render Docker web service blueprint
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
- Dynamic container `PORT` binding (`server.port=${PORT:${SERVER_PORT:8080}}`) & `server.forward-headers-strategy=framework`
- Existing MySQL 8 JDBC connection (`DB_URL` or `DB_HOST` / `DB_PORT` / `DB_NAME`)
- `Secure` `HttpOnly` cookies (`JWT_COOKIE_SECURE=true`, `JWT_COOKIE_SAME_SITE=None` for cross-origin HTTPS Vercel + Render domains, or `Lax` for same-origin reverse proxy)
- Writable container upload storage (`/tmp/jobconnect/resumes` by default)
- Strict environment variables (`DB_URL`/`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_AUTH_REDIRECT_URI`)

---

## 4c. Deploying Backend to Render & Frontend to Vercel

### 1. Deploy Spring Boot Backend on Render (Docker)
1. In **Render Dashboard**, create a **New Web Service** (or import `render.yaml`) pointing to your GitHub repository with:
   - **Runtime:** Docker
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Docker Context:** `./backend`
   - **Health Check Path:** `/api/health`
2. Set the environment variables in Render using your **existing MySQL database**, JWT secret, Google OAuth credentials, and Vercel URL:
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DB_URL` (or `DB_HOST`, `DB_PORT`, `DB_NAME`) + `DB_USERNAME` + `DB_PASSWORD`
   - `JWT_SECRET` (strong Base64 secret, e.g. `openssl rand -base64 48`)
   - `JWT_COOKIE_SECURE=true`, `JWT_COOKIE_SAME_SITE=None`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL=https://YOUR_VERCEL_APP.vercel.app`
   - `APP_CORS_ALLOWED_ORIGINS=https://YOUR_VERCEL_APP.vercel.app`
   - `APP_FRONTEND_AUTH_REDIRECT_URI=https://YOUR_VERCEL_APP.vercel.app/oauth/callback`
3. Copy your Render service's **Deploy Hook URL** (Settings → Deploy Hook) for GitHub Actions.

### 2. Configure Google Cloud Console OAuth Callback
Once Render assigns your `BACKEND_URL` (e.g. `https://jobconnect-backend.onrender.com`):
- Add `https://YOUR_VERCEL_APP.vercel.app` and `https://YOUR_RENDER_BACKEND.onrender.com` to **Authorized JavaScript origins**.
- Add `https://YOUR_RENDER_BACKEND.onrender.com/login/oauth2/code/google` to **Authorized redirect URIs**.

### 3. Deploy React Frontend on Vercel
Set `VITE_API_BASE_URL="https://YOUR_RENDER_BACKEND.onrender.com/api"` and `VITE_API_FALLBACK_TO_MOCK="false"` in Vercel Project Environment Variables (or GitHub Secrets). `vercel.json` handles Vite builds and SPA client-side routing (`/oauth/callback`, `/auth`, `/dashboard`, `/admin`).

---

## 4d. Automated GitHub Actions CI/CD (Vercel + Render)

Two independent workflows run on every push/PR to `main` and via **Run workflow**:

- `/.github/workflows/deploy-frontend-vercel.yml` — Runs `npm ci`, `npm run lint` (`tsc --noEmit`), and `npm run build`, then deploys to **Vercel**.
- `/.github/workflows/deploy-backend-render.yml` — Runs `mvn test -B` and `mvn package -DskipTests -B`, then triggers **Render** via its Deploy Hook.

### Required GitHub Repository Secrets
- **Vercel Frontend Workflow:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VITE_API_BASE_URL` (e.g. `https://jobconnect-backend.onrender.com/api`)
- **Render Backend Workflow:** `RENDER_DEPLOY_HOOK_URL` (and optional `RENDER_BACKEND_URL` for summary output)

---

## 5. REST API Endpoints

### Health & Authentication
- `GET /api/health` — Public readiness / health check (Render health check)
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

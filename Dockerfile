# Multi-stage production Dockerfile for JobConnect React + Vite Frontend (Google Cloud Run)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY index.html tsconfig.json vite.config.ts metadata.json ./
COPY public ./public
COPY src ./src

ARG VITE_API_BASE_URL=""
ARG VITE_API_FALLBACK_TO_MOCK="false"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_FALLBACK_TO_MOCK=${VITE_API_FALLBACK_TO_MOCK}

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV PORT=8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

# Multi-stage production Dockerfile for JobConnect Spring Boot Backend (Render / Docker)
FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace

# Install retry wrapper for transient Maven Central 429/5xx errors
COPY mvn-with-retry.sh /usr/local/bin/mvn-with-retry.sh
RUN chmod +x /usr/local/bin/mvn-with-retry.sh

# Cache Maven dependencies in a separate layer before copying application source
COPY pom.xml .
RUN /usr/local/bin/mvn-with-retry.sh dependency:go-offline

# Build executable Spring Boot fat JAR and normalize output filename
COPY src ./src
RUN /usr/local/bin/mvn-with-retry.sh package -DskipTests \
    && cp target/jobconnect-backend-*.jar /workspace/app.jar

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

# Create non-root user and writable temporary resume upload directories
RUN groupadd --system spring && useradd --system --gid spring spring \
    && mkdir -p /app/storage/resumes /tmp/jobconnect/resumes \
    && chown -R spring:spring /app /tmp/jobconnect

COPY --from=builder --chown=spring:spring /workspace/app.jar /app/app.jar

USER spring:spring

# Render injects PORT dynamically (default 8080)
ENV SPRING_PROFILES_ACTIVE=prod
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom -Dserver.port=${PORT:-8080} -jar /app/app.jar"]

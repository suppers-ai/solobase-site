---
title: "Docker Deployment"
description: "Deploy Solobase using Docker and Docker Compose"
weight: 10
tags: ["deployment", "docker", "containers", "production"]
---

# Docker Deployment

Docker provides the easiest way to deploy Solobase in production. This guide covers single-container deployment, multi-container setups with Docker Compose, and production best practices.

## Quick Start with Docker

### Single Container

Run Solobase with SQLite (good for testing):

```bash
docker run -d \
  --name solobase \
  -p 8080:8080 \
  -v solobase_data:/app/data \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_PASSWORD="changeme123" \
  solobase/solobase:latest
```

### With External Database

Run with PostgreSQL:

```bash
docker run -d \
  --name solobase \
  -p 8080:8080 \
  -v solobase_storage:/app/storage \
  -e DATABASE_URL="postgres://user:pass@db:5432/solobase" \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_PASSWORD="secure_password" \
  -e JWT_SECRET="your-jwt-secret-here" \
  solobase/solobase:latest
```

## Docker Compose Deployment

### Basic Setup

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  solobase:
    image: solobase/solobase:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=sqlite:///app/data/solobase.db
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=changeme123
      - JWT_SECRET=your-super-secret-jwt-key
      - SESSION_SECRET=your-session-secret-key
    volumes:
      - solobase_data:/app/data
      - solobase_storage:/app/storage
    restart: unless-stopped

volumes:
  solobase_data:
  solobase_storage:
```

Run with:

```bash
docker-compose up -d
```

### Production Setup with PostgreSQL

```yaml
version: '3.8'

services:
  solobase:
    image: solobase/solobase:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://solobase:${DB_PASSWORD}@db:5432/solobase
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - BASE_URL=https://solobase.example.com
    volumes:
      - solobase_storage:/app/storage
      - ./config:/app/config:ro
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=solobase
      - POSTGRES_USER=solobase
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U solobase"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  solobase_storage:
  postgres_data:
  redis_data:
```

Create a `.env` file:

```bash
# .env
DB_PASSWORD=secure_database_password
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
JWT_SECRET=your-256-bit-jwt-secret-key
SESSION_SECRET=your-session-encryption-key
```

### With Reverse Proxy (Nginx)

Add Nginx for SSL termination and load balancing:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - solobase
    restart: unless-stopped

  solobase:
    image: solobase/solobase:latest
    expose:
      - "8080"
    environment:
      - DATABASE_URL=postgres://solobase:${DB_PASSWORD}@db:5432/solobase
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - BASE_URL=https://solobase.example.com
    volumes:
      - solobase_storage:/app/storage
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=solobase
      - POSTGRES_USER=solobase
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  solobase_storage:
  postgres_data:
```

Nginx configuration (`nginx.conf`):

```nginx
events {
    worker_connections 1024;
}

http {
    upstream solobase {
        server solobase:8080;
    }

    server {
        listen 80;
        server_name solobase.example.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name solobase.example.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 100M;

        location / {
            proxy_pass http://solobase;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Environment Variables

### Required Variables

```bash
# Authentication
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password_123
JWT_SECRET=your-256-bit-secret-key
SESSION_SECRET=your-session-key

# Database
DATABASE_URL=postgres://user:pass@host:port/dbname
```

### Optional Variables

```bash
# Server Configuration
PORT=8080
HOST=0.0.0.0
BASE_URL=https://solobase.example.com

# Storage
STORAGE_PROVIDER=local
STORAGE_PATH=/app/storage
# Or for S3:
# STORAGE_PROVIDER=s3
# AWS_BUCKET=my-solobase-bucket
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret

# Email (optional)
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# CORS
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

## Custom Docker Image

### Dockerfile

Create a custom image with your configuration:

```dockerfile
FROM solobase/solobase:latest

# Copy custom configuration
COPY config.yaml /app/config/config.yaml

# Copy custom static files (optional)
COPY static/ /app/static/

# Set custom environment variables
ENV LOG_LEVEL=info
ENV RATE_LIMIT_ENABLED=true

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run as non-root user
USER solobase

CMD ["solobase", "serve"]
```

Build and run:

```bash
# Build custom image
docker build -t my-solobase:latest .

# Run custom image
docker run -d \
  --name my-solobase \
  -p 8080:8080 \
  -v solobase_data:/app/data \
  my-solobase:latest
```

## Production Best Practices

### 1. Use Secrets Management

Don't put secrets in environment variables. Use Docker secrets:

```yaml
version: '3.8'

services:
  solobase:
    image: solobase/solobase:latest
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DATABASE_URL=postgres://solobase:$(cat /run/secrets/db_password)@db:5432/solobase
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### 2. Resource Limits

Set resource limits to prevent containers from consuming all system resources:

```yaml
services:
  solobase:
    image: solobase/solobase:latest
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

### 3. Health Checks

Implement proper health checks:

```yaml
services:
  solobase:
    image: solobase/solobase:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 4. Logging Configuration

Configure structured logging:

```yaml
services:
  solobase:
    image: solobase/solobase:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5. Security Hardening

Run as non-root user and use read-only filesystem:

```yaml
services:
  solobase:
    image: solobase/solobase:latest
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - solobase_data:/app/data
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

## Scaling and Load Balancing

### Multiple Instances

Run multiple Solobase instances behind a load balancer:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - solobase-1
      - solobase-2
      - solobase-3

  solobase-1:
    image: solobase/solobase:latest
    environment:
      - DATABASE_URL=postgres://solobase:${DB_PASSWORD}@db:5432/solobase
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  solobase-2:
    image: solobase/solobase:latest
    environment:
      - DATABASE_URL=postgres://solobase:${DB_PASSWORD}@db:5432/solobase
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  solobase-3:
    image: solobase/solobase:latest
    environment:
      - DATABASE_URL=postgres://solobase:${DB_PASSWORD}@db:5432/solobase
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    # ... database configuration

  redis:
    image: redis:7-alpine
    # ... redis configuration
```

Load balancer configuration (`nginx-lb.conf`):

```nginx
events {
    worker_connections 1024;
}

http {
    upstream solobase_backend {
        least_conn;
        server solobase-1:8080;
        server solobase-2:8080;
        server solobase-3:8080;
    }

    server {
        listen 80;
        
        location / {
            proxy_pass http://solobase_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

## Monitoring and Observability

### Prometheus Metrics

Add Prometheus monitoring:

```yaml
version: '3.8'

services:
  solobase:
    image: solobase/solobase:latest
    environment:
      - METRICS_ENABLED=true
      - METRICS_PORT=9090

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

Prometheus configuration (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'solobase'
    static_configs:
      - targets: ['solobase:9090']
```

## Backup and Recovery

### Database Backups

Automated PostgreSQL backups:

```yaml
services:
  backup:
    image: postgres:15-alpine
    environment:
      - PGPASSWORD=${DB_PASSWORD}
    volumes:
      - ./backups:/backups
    command: |
      sh -c '
      while true; do
        pg_dump -h db -U solobase solobase > /backups/backup_$$(date +%Y%m%d_%H%M%S).sql
        find /backups -name "backup_*.sql" -mtime +7 -delete
        sleep 86400
      done'
    depends_on:
      - db
```

### Storage Backups

Backup file storage to S3:

```bash
#!/bin/bash
# backup-storage.sh

docker run --rm \
  -v solobase_storage:/data \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  amazon/aws-cli \
  s3 sync /data s3://my-backup-bucket/solobase-storage/
```

## Troubleshooting

### Container Won't Start

Check logs:

```bash
# View container logs
docker logs solobase

# Follow logs in real-time
docker logs -f solobase

# Check container status
docker ps -a
```

### Database Connection Issues

Test database connectivity:

```bash
# Connect to database container
docker exec -it postgres_container psql -U solobase -d solobase

# Test connection from solobase container
docker exec -it solobase solobase check-db
```

### Performance Issues

Monitor resource usage:

```bash
# Check container resource usage
docker stats

# Check system resources
docker system df
docker system prune
```

## Next Steps

- [Cloud Deployment](/docs/deployment/cloud/) - Deploy to cloud platforms
- [Environment Variables](/docs/deployment/environment/) - Complete environment reference
- [Security](/docs/deployment/security/) - Security best practices
- [Monitoring](/docs/monitoring/) - Advanced monitoring setup
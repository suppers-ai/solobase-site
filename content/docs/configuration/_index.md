---
title: "Configuration"
description: "Configure Solobase for your environment and requirements"
weight: 20
tags: ["configuration", "setup", "environment"]
---

# Configuration

Solobase can be configured through environment variables, configuration files, or command-line flags. This guide covers all available configuration options.

## Configuration Methods

### 1. Environment Variables

The most common way to configure Solobase:

```bash
export DATABASE_URL="sqlite:///app/data/solobase.db"
export PORT=8080
export ADMIN_EMAIL="admin@example.com"
solobase serve
```

### 2. Configuration File

Create a `config.yaml` file:

```yaml
# config.yaml
server:
  port: 8080
  host: "0.0.0.0"
  
database:
  url: "sqlite:///app/data/solobase.db"
  max_connections: 10
  
admin:
  email: "admin@example.com"
  password: "secure_password_123"
  
storage:
  provider: "local"
  path: "/app/storage"
```

Then run:

```bash
solobase serve --config config.yaml
```

### 3. Command-Line Flags

Override any setting with command-line flags:

```bash
solobase serve \
  --port 8080 \
  --database-url "postgres://user:pass@localhost/solobase" \
  --admin-email "admin@example.com"
```

## Core Configuration

### Server Settings

| Environment Variable | Config File | Flag | Default | Description |
|---------------------|-------------|------|---------|-------------|
| `PORT` | `server.port` | `--port` | `8080` | HTTP server port |
| `HOST` | `server.host` | `--host` | `0.0.0.0` | HTTP server host |
| `BASE_URL` | `server.base_url` | `--base-url` | `http://localhost:8080` | Public base URL |
| `TLS_CERT` | `server.tls.cert` | `--tls-cert` | - | TLS certificate file |
| `TLS_KEY` | `server.tls.key` | `--tls-key` | - | TLS private key file |

Example server configuration:

```yaml
server:
  port: 8080
  host: "0.0.0.0"
  base_url: "https://solobase.example.com"
  tls:
    cert: "/etc/ssl/certs/solobase.crt"
    key: "/etc/ssl/private/solobase.key"
  timeouts:
    read: "30s"
    write: "30s"
    idle: "120s"
```

### Database Configuration

Solobase supports multiple database backends:

#### SQLite (Default)

```bash
# Environment variable
export DATABASE_URL="sqlite:///app/data/solobase.db"

# Config file
database:
  url: "sqlite:///app/data/solobase.db"
  pragma:
    journal_mode: "WAL"
    synchronous: "NORMAL"
    cache_size: "-64000"
```

#### PostgreSQL

```bash
# Environment variable
export DATABASE_URL="postgres://user:password@localhost:5432/solobase?sslmode=disable"

# Config file
database:
  url: "postgres://user:password@localhost:5432/solobase"
  max_connections: 25
  max_idle_connections: 5
  connection_max_lifetime: "1h"
  ssl_mode: "require"
```

#### MySQL

```bash
# Environment variable
export DATABASE_URL="mysql://user:password@localhost:3306/solobase?parseTime=true"

# Config file
database:
  url: "mysql://user:password@localhost:3306/solobase"
  max_connections: 25
  max_idle_connections: 5
  connection_max_lifetime: "1h"
  charset: "utf8mb4"
```

### Authentication & Security

| Environment Variable | Config File | Description |
|---------------------|-------------|-------------|
| `ADMIN_EMAIL` | `admin.email` | Default admin email |
| `ADMIN_PASSWORD` | `admin.password` | Default admin password |
| `JWT_SECRET` | `auth.jwt_secret` | JWT signing secret |
| `SESSION_SECRET` | `auth.session_secret` | Session encryption key |
| `PASSWORD_MIN_LENGTH` | `auth.password_min_length` | Minimum password length |

```yaml
auth:
  jwt_secret: "your-super-secret-jwt-key-here"
  session_secret: "your-session-encryption-key"
  password_min_length: 8
  session_timeout: "24h"
  max_login_attempts: 5
  lockout_duration: "15m"
  
admin:
  email: "admin@example.com"
  password: "secure_password_123"
  require_password_change: true
```

### Storage Configuration

Configure file storage backend:

#### Local Storage

```yaml
storage:
  provider: "local"
  path: "/app/storage"
  max_file_size: "100MB"
  allowed_extensions: [".jpg", ".png", ".pdf", ".txt"]
```

#### AWS S3

```yaml
storage:
  provider: "s3"
  bucket: "my-solobase-bucket"
  region: "us-east-1"
  access_key_id: "AKIAIOSFODNN7EXAMPLE"
  secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  endpoint: ""  # Optional for S3-compatible services
```

#### Google Cloud Storage

```yaml
storage:
  provider: "gcs"
  bucket: "my-solobase-bucket"
  credentials_file: "/path/to/service-account.json"
  project_id: "my-gcp-project"
```

## Advanced Configuration

### Logging

```yaml
logging:
  level: "info"  # debug, info, warn, error
  format: "json"  # json, text
  output: "stdout"  # stdout, stderr, file path
  file:
    path: "/var/log/solobase.log"
    max_size: "100MB"
    max_backups: 5
    max_age: 30  # days
```

### CORS Settings

```yaml
cors:
  allowed_origins: ["https://example.com", "https://app.example.com"]
  allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  allowed_headers: ["Content-Type", "Authorization"]
  allow_credentials: true
  max_age: 86400
```

### Rate Limiting

```yaml
rate_limiting:
  enabled: true
  requests_per_minute: 60
  burst: 10
  cleanup_interval: "1m"
  
  # Per-endpoint limits
  endpoints:
    "/api/auth/login":
      requests_per_minute: 5
      burst: 2
    "/api/upload":
      requests_per_minute: 10
      burst: 3
```

### Caching

```yaml
cache:
  provider: "memory"  # memory, redis
  ttl: "1h"
  max_size: "100MB"
  
  # Redis configuration (if provider is redis)
  redis:
    url: "redis://localhost:6379/0"
    password: ""
    max_connections: 10
```

### Email Configuration

```yaml
email:
  provider: "smtp"  # smtp, sendgrid, mailgun
  from: "noreply@example.com"
  
  # SMTP settings
  smtp:
    host: "smtp.gmail.com"
    port: 587
    username: "your-email@gmail.com"
    password: "your-app-password"
    tls: true
  
  # SendGrid settings
  sendgrid:
    api_key: "SG.your-api-key"
  
  # Mailgun settings
  mailgun:
    domain: "mg.example.com"
    api_key: "your-api-key"
```

## Environment-Specific Configurations

### Development

```yaml
# config.dev.yaml
server:
  port: 3000
  
database:
  url: "sqlite:///dev.db"
  
logging:
  level: "debug"
  format: "text"
  
cors:
  allowed_origins: ["http://localhost:3000", "http://localhost:5173"]
```

### Production

```yaml
# config.prod.yaml
server:
  port: 8080
  base_url: "https://solobase.example.com"
  tls:
    cert: "/etc/ssl/certs/solobase.crt"
    key: "/etc/ssl/private/solobase.key"
  
database:
  url: "postgres://solobase:${DB_PASSWORD}@db:5432/solobase"
  max_connections: 50
  
logging:
  level: "info"
  format: "json"
  output: "/var/log/solobase.log"
  
rate_limiting:
  enabled: true
  requests_per_minute: 100
```

## Configuration Validation

Solobase validates your configuration on startup. Common validation errors:

### Invalid Database URL

```
Error: invalid database URL format
Expected: postgres://user:pass@host:port/dbname
Got: postgres://invalid-url
```

### Missing Required Fields

```
Error: missing required configuration
- admin.email is required
- auth.jwt_secret is required (or JWT_SECRET environment variable)
```

### Invalid File Paths

```
Error: storage path does not exist or is not writable
Path: /nonexistent/storage
```

## Configuration Examples

### Minimal Configuration

```yaml
admin:
  email: "admin@example.com"
  password: "changeme123"
```

### Complete Production Configuration

```yaml
server:
  port: 8080
  host: "0.0.0.0"
  base_url: "https://solobase.example.com"
  
database:
  url: "postgres://solobase:password@localhost:5432/solobase"
  max_connections: 25
  
admin:
  email: "admin@example.com"
  password: "secure_password_123"
  
auth:
  jwt_secret: "your-256-bit-secret"
  session_secret: "your-session-key"
  session_timeout: "24h"
  
storage:
  provider: "s3"
  bucket: "solobase-files"
  region: "us-east-1"
  
logging:
  level: "info"
  format: "json"
  output: "/var/log/solobase.log"
  
rate_limiting:
  enabled: true
  requests_per_minute: 100
  
email:
  provider: "smtp"
  from: "noreply@example.com"
  smtp:
    host: "smtp.example.com"
    port: 587
    username: "solobase@example.com"
    password: "email_password"
    tls: true
```

## Configuration Best Practices

1. **Use Environment Variables for Secrets**: Never store passwords or API keys in configuration files
2. **Validate Configuration**: Always test your configuration in a staging environment first
3. **Use Strong Secrets**: Generate cryptographically secure secrets for JWT and session keys
4. **Enable TLS in Production**: Always use HTTPS in production environments
5. **Configure Rate Limiting**: Protect your API from abuse with appropriate rate limits
6. **Set Up Proper Logging**: Configure structured logging for better observability
7. **Use Database Connection Pooling**: Configure appropriate connection limits for your database

## Next Steps

- [Quick Start Guide](/docs/quick-start/) - Get your first project running
- [Dashboard Overview](/docs/dashboard/) - Learn about the admin interface
- [Deployment Guide](/docs/deployment/) - Deploy to production
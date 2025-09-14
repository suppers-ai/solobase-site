---
title: "Installation"
description: "Download and install Solobase on your system"
weight: 10
tags: ["installation", "setup", "getting-started"]
---

# Installing Solobase

Solobase is a Go package that you can integrate into your applications. It provides a complete backend solution with authentication, database management, and admin interface.

## Quick Install

The fastest way to get started with Solobase is using Go:

```bash
# Install Go if you haven't already
# Visit https://go.dev/dl/ for installation instructions

# Create your project
mkdir my-app && cd my-app
go mod init my-app

# Get Solobase
go get github.com/suppers-ai/solobase
```

## Creating Your First Application

Create a simple Solobase application:

```go
// main.go
package main

import (
    "log"
    "github.com/suppers-ai/solobase"
)

func main() {
    // Create a new Solobase app
    app := solobase.New()

    // Initialize and start
    if err := app.Initialize(); err != nil {
        log.Fatal(err)
    }

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

Run your application:

```bash
go run main.go
```

## Installation Requirements

### System Requirements

- **Go**: Version 1.21 or later
- **Operating System**: Linux, macOS, or Windows
- **Database**: SQLite (built-in), PostgreSQL, or MySQL
- **Memory**: Minimum 512MB RAM
- **Disk**: Minimum 100MB free space

### Installing Go

If you don't have Go installed, follow the official installation guide:

**[📦 Install Go](https://go.dev/doc/install)**

The official guide provides:
- Download links for all platforms
- Step-by-step installation instructions
- Verification steps
- Environment setup

After installation, verify Go is installed correctly:

```bash
go version
```

You should see output like:
```bash
go version go1.21.0 linux/amd64
```

## Advanced Installation Options

### With Custom Configuration

```go
package main

import (
    "log"
    "os"
    "github.com/suppers-ai/solobase"
)

func main() {
    app := solobase.NewWithOptions(solobase.Options{
        DatabaseType:         "postgres",
        DatabaseURL:         os.Getenv("DATABASE_URL"),
        StorageType:         "s3",
        S3Config: &solobase.S3Config{
            Bucket:          os.Getenv("S3_BUCKET"),
            Region:          os.Getenv("AWS_REGION"),
            AccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
            SecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        },
        DefaultAdminEmail:    os.Getenv("ADMIN_EMAIL"),
        DefaultAdminPassword: os.Getenv("ADMIN_PASSWORD"),
        JWTSecret:           os.Getenv("JWT_SECRET"),
        Port:                os.Getenv("PORT"),
    })

    if err := app.Initialize(); err != nil {
        log.Fatal("Failed to initialize:", err)
    }

    if err := app.Start(); err != nil {
        log.Fatal("Failed to start:", err)
    }
}
```

### With Extensions

```go
package main

import (
    "log"
    "github.com/suppers-ai/solobase"
    "github.com/suppers-ai/solobase/extensions/official/webhooks"
    "github.com/suppers-ai/solobase/extensions/official/analytics"
)

func main() {
    app := solobase.New()

    // Register extensions
    app.RegisterExtension(webhooks.New())
    app.RegisterExtension(analytics.New())

    if err := app.Initialize(); err != nil {
        log.Fatal(err)
    }

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## Building from Source

If you want to contribute or customize Solobase:

### Prerequisites

- Go 1.21 or later
- Git
- Make (optional)

### Clone and Build

```bash
# Clone the repository
git clone https://github.com/suppers-ai/solobase.git
cd solobase

# Install dependencies
go mod download

# Build the project
go build -o solobase ./cmd/solobase

# Or use the build script
./compile.sh

# Run the built binary
./solobase
```

### Development Mode

For development with hot reload:

```bash
# Install air for hot reload
go install github.com/air-verse/air@latest

# Run in development mode
air
```

## Verification

After creating your application, verify it works:

```bash
# Run your application
go run main.go
```

You should see output similar to:

```bash
2024/01/15 14:30:00 Initializing Solobase...
2024/01/15 14:30:00 Database connected: SQLite
2024/01/15 14:30:00 Admin user created: admin@example.com
2024/01/15 14:30:00 Server starting on :8080
2024/01/15 14:30:00 Admin panel: http://localhost:8080/admin
```

Visit http://localhost:8080/admin to access the admin panel.

## Next Steps

Now that Solobase is installed:

1. [Configure your instance](/docs/configuration/) with your preferred settings
2. Follow the [Quick Start Guide](/docs/quick-start/) to set up your first project
3. Explore the [Dashboard](/docs/dashboard/) to understand the interface

## Troubleshooting

### Module Download Issues

If you have problems downloading the module:

```bash
# Clear module cache
go clean -modcache

# Set Go proxy (if behind firewall)
export GOPROXY=https://proxy.golang.org,direct

# Try again
go get github.com/suppers-ai/solobase
```

### Port Already in Use

If port 8080 is already in use:

```go
// Use a different port in your code
app := solobase.NewWithOptions(solobase.Options{
    Port: "8081",
    // ... other options
})

// Or use environment variable
app := solobase.NewWithOptions(solobase.Options{
    Port: os.Getenv("PORT"),
    // ... other options
})
```

### Database Connection Issues

For database connection problems:

```go
// SQLite (default)
app := solobase.NewWithOptions(solobase.Options{
    DatabaseType: "sqlite",
    DatabaseURL: "sqlite:///path/to/database.db",
})

// PostgreSQL
app := solobase.NewWithOptions(solobase.Options{
    DatabaseType: "postgres",
    DatabaseURL: "postgres://user:password@localhost/dbname?sslmode=disable",
})

// MySQL
app := solobase.NewWithOptions(solobase.Options{
    DatabaseType: "mysql",
    DatabaseURL: "user:password@tcp(localhost:3306)/dbname?parseTime=true",
})
```

## Docker Deployment

You can also containerize your Solobase application:

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o solobase-app main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/solobase-app .

EXPOSE 8080
CMD ["./solobase-app"]
```

Build and run:

```bash
docker build -t my-solobase-app .
docker run -p 8080:8080 my-solobase-app
```

## Support

If you encounter issues during installation:

- Check our [Troubleshooting Guide](/docs/troubleshooting/)
- Search existing [GitHub Issues](https://github.com/suppers-ai/solobase/issues)
- Join our [Discord Community](https://discord.gg/jKqMcbrVzm)
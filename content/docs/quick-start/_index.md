---
title: "Quick Start Guide"
description: "Get up and running with Solobase in minutes"
weight: 30
tags: ["quick-start", "tutorial", "getting-started"]
---

# Quick Start Guide

This guide will help you get Solobase up and running in just a few minutes. By the end, you'll have a working admin dashboard with user management and database browsing capabilities.

## Prerequisites

Before starting, make sure you have:
- Go 1.21 or later installed ([Download Go](https://go.dev/dl/))
- A terminal or command prompt
- A web browser

## Step 1: Create Your Solobase Application

Create a new Go module for your Solobase project:

```bash
# Create project directory
mkdir my-solobase-app
cd my-solobase-app

# Initialize Go module
go mod init my-solobase-app

# Get Solobase package
go get github.com/suppers-ai/solobase
```

## Step 2: Create Your Application

Create a `main.go` file with your Solobase application:

```go
package main

import (
    "log"
    "github.com/suppers-ai/solobase"
)

func main() {
    // Create a new Solobase app with options
    app := solobase.NewWithOptions(solobase.Options{
        DatabaseType: "sqlite",
        DatabaseURL: "sqlite:///data/solobase.db",
        DefaultAdminEmail: "admin@example.com",
        DefaultAdminPassword: "changeme123", // Change this!
        JWTSecret: "your-secret-key-here", // Generate a secure key
        Port: "8080",
    })

    // Initialize the application
    if err := app.Initialize(); err != nil {
        log.Fatal("Failed to initialize app:", err)
    }

    // Start the server
    log.Println("Starting Solobase on http://localhost:8080")
    if err := app.Start(); err != nil {
        log.Fatal("Failed to start app:", err)
    }
}
```

## Step 3: Advanced Configuration (Optional)

For more advanced configuration, you can use environment variables or a config file:

```go
// Using environment variables
app := solobase.NewWithOptions(solobase.Options{
    DatabaseURL: os.Getenv("DATABASE_URL"),
    JWTSecret: os.Getenv("JWT_SECRET"),
    Port: os.Getenv("PORT"),
})
```

Or create a more complex application with hooks:

```go
app := solobase.New()

// Add custom middleware
app.OnServe(func(e *solobase.ServeEvent) error {
    e.Router.Use(customMiddleware)
    return e.Next()
})

// Add API hooks
app.OnBeforeAPI("/api/users/*", func(e *solobase.APIEvent) error {
    log.Printf("User API accessed: %s", e.Request.URL.Path)
    return e.Next()
})

## Step 4: Build and Run Your Application

Build and run your Solobase application:

```bash
# Build the application
go build -o solobase-app

# Run the application
./solobase-app
```

Or run directly:

```bash
go run main.go
```

You should see output like:

```bash
2024/01/15 14:30:00 Starting Solobase on http://localhost:8080
2024/01/15 14:30:00 Database initialized: SQLite
2024/01/15 14:30:00 Admin user created: admin@example.com
2024/01/15 14:30:00 Server ready at http://localhost:8080
2024/01/15 14:30:00 Admin panel available at http://localhost:8080/admin
```

## Step 5: Access the Admin Dashboard

Open your web browser and navigate to [http://localhost:8080/admin](http://localhost:8080/admin).

Log in with your admin credentials:
- **Email**: `admin@example.com`
- **Password**: `changeme123` (or whatever you set)

## Step 6: Explore the Dashboard

Once logged in, you'll see the main dashboard with several sections:

### Overview
- System statistics
- Recent activity
- Quick actions

### User Management
- View and manage users
- Create new users
- Set permissions and roles

### Database Browser
- Browse database tables
- View and edit records
- Execute custom queries

### File Storage
- Upload and manage files
- Organize files in folders
- Set access permissions

## Step 7: Create Your First User

Let's create a new user through the admin interface:

1. Navigate to **Users** in the sidebar
2. Click **Add New User**
3. Fill in the form:
   ```
   Name: John Doe
   Email: john@example.com
   Password: secure123
   Role: User
   ```
4. Click **Create User**

## Step 8: Set Up a Database Table

Create a simple table to store some data:

1. Go to **Database** → **Tables**
2. Click **Create Table**
3. Configure your table:
   ```sql
   CREATE TABLE products (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     description TEXT,
     price DECIMAL(10,2),
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
4. Click **Execute**

## Step 9: Add Some Data

Add sample data to your new table:

1. Navigate to **Database** → **Tables** → **products**
2. Click **Add Record**
3. Fill in the form:
   ```
   Name: Laptop Computer
   Description: High-performance laptop for developers
   Price: 1299.99
   ```
4. Click **Save**

Repeat this process to add a few more products.

## Step 10: Upload Files

Test the file storage functionality:

1. Go to **Storage** → **Files**
2. Click **Upload Files**
3. Select some files from your computer
4. Organize them into folders if desired

## Step 11: Explore the API

Solobase provides a REST API for all functionality. Test it using curl:

```bash
# Get an authentication token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme123"}'

# Use the token to access the API
export TOKEN="your-jwt-token-here"

# List users
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/users

# Get products
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/database/products

# Upload a file
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/file.jpg" \
  http://localhost:8080/api/storage/upload
```

## Common Next Steps

Now that you have Solobase running, here are some common next steps:

### 1. Add Extensions

Enhance your application with extensions:

```go
package main

import (
    "github.com/suppers-ai/solobase"
    "github.com/suppers-ai/solobase/extensions/official/webhooks"
    "github.com/suppers-ai/solobase/extensions/official/analytics"
)

func main() {
    app := solobase.New()

    // Register extensions
    app.RegisterExtension(webhooks.New())
    app.RegisterExtension(analytics.New())

    app.Initialize()
    app.Start()
}
```

### 2. Set Up User Roles

Define custom roles and permissions:

```yaml
# Add to config.yaml
auth:
  roles:
    editor:
      permissions: ["read", "write"]
      tables: ["products", "categories"]
    viewer:
      permissions: ["read"]
      tables: ["products"]
```

### 3. Configure Email Notifications

Set up email notifications for user actions:

```yaml
# Add to config.yaml
email:
  provider: "smtp"
  from: "noreply@example.com"
  smtp:
    host: "smtp.gmail.com"
    port: 587
    username: "your-email@gmail.com"
    password: "your-app-password"
    tls: true

notifications:
  new_user: true
  password_reset: true
  data_changes: true
```

### 4. Add Custom Validation

Create validation rules for your data:

```yaml
# Add to config.yaml
validation:
  tables:
    products:
      name:
        required: true
        min_length: 3
        max_length: 100
      price:
        required: true
        min: 0
        max: 999999.99
      email:
        format: "email"
```

### 5. Set Up Backups

Configure automatic database backups:

```yaml
# Add to config.yaml
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention: 30  # Keep 30 days
  storage:
    provider: "s3"
    bucket: "my-backups"
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Update dependencies
go mod tidy

# Clear module cache if needed
go clean -modcache

# Verify Go version
go version  # Should be 1.21 or later
```

### Can't Access Admin Panel

If you can't access the admin panel:

1. Check that the server is running on the correct port
2. Verify your admin credentials
3. Check firewall settings
4. Try accessing via `127.0.0.1` instead of `localhost`

### Database Connection Issues

For database problems:

```go
// Use PostgreSQL instead of SQLite
app := solobase.NewWithOptions(solobase.Options{
    DatabaseType: "postgres",
    DatabaseURL: "postgres://user:pass@localhost/solobase",
    // ... other options
})

// Or MySQL
app := solobase.NewWithOptions(solobase.Options{
    DatabaseType: "mysql",
    DatabaseURL: "mysql://user:pass@localhost/solobase",
    // ... other options
})
```

## Production Deployment

When you're ready to deploy to production:

1. **Use a Production Database**: Switch from SQLite to PostgreSQL or MySQL
2. **Enable HTTPS**: Configure TLS certificates
3. **Set Strong Secrets**: Generate cryptographically secure keys
4. **Configure Backups**: Set up automated database backups
5. **Enable Monitoring**: Add logging and metrics collection
6. **Use Environment Variables**: Store secrets in environment variables

See our [Deployment Guide](/docs/deployment/) for detailed instructions.

## What's Next?

- [Dashboard Overview](/docs/dashboard/) - Learn about all dashboard features
- [User Management](/docs/users/) - Advanced user and permission management
- [Database Browser](/docs/database/) - Advanced database operations
- [API Reference](/docs/api/) - Complete API documentation
- [Deployment](/docs/deployment/) - Deploy to production environments

## Getting Help

If you need help:

- Check our [Documentation](/docs/)
- Try the [Live Demo](/demo/)
- Search [GitHub Issues](https://github.com/suppers-ai/solobase/issues)
- Join our [Discord Community](https://discord.gg/jKqMcbrVzm)

Congratulations! You now have a fully functional Solobase instance. Explore the documentation to learn about advanced features and customization options.
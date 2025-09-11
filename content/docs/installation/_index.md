---
title: "Installation"
description: "Download and install Solobase on your system"
weight: 10
tags: ["installation", "setup", "getting-started"]
---

# Installing Solobase

Solobase can be installed in several ways depending on your needs and environment. Choose the method that works best for your setup.

## Quick Install (Recommended)

The fastest way to get started with Solobase is using our installation script:

```bash
# Download and run the installation script
curl -fsSL https://get.solobase.dev | bash

# Or with wget
wget -qO- https://get.solobase.dev | bash
```

This script will:
- Detect your operating system and architecture
- Download the appropriate binary
- Install it to `/usr/local/bin/solobase`
- Set up basic configuration

## Manual Installation

### Download Pre-built Binaries

Download the latest release for your platform from our [GitHub releases page](https://github.com/suppers-ai/solobase/releases):

```bash
# Linux (x86_64)
wget https://github.com/suppers-ai/solobase/releases/latest/download/solobase-linux-amd64.tar.gz
tar -xzf solobase-linux-amd64.tar.gz
sudo mv solobase /usr/local/bin/

# macOS (Intel)
wget https://github.com/suppers-ai/solobase/releases/latest/download/solobase-darwin-amd64.tar.gz
tar -xzf solobase-darwin-amd64.tar.gz
sudo mv solobase /usr/local/bin/

# macOS (Apple Silicon)
wget https://github.com/suppers-ai/solobase/releases/latest/download/solobase-darwin-arm64.tar.gz
tar -xzf solobase-darwin-arm64.tar.gz
sudo mv solobase /usr/local/bin/

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/suppers-ai/solobase/releases/latest/download/solobase-windows-amd64.zip" -OutFile "solobase.zip"
Expand-Archive -Path "solobase.zip" -DestinationPath "."
Move-Item "solobase.exe" "C:\Program Files\solobase\"
```

### Using Package Managers

#### Homebrew (macOS/Linux)

```bash
# Add our tap
brew tap solobase/tap

# Install Solobase
brew install solobase
```

#### Snap (Linux)

```bash
# Install from Snap Store
sudo snap install solobase

# Enable necessary permissions
sudo snap connect solobase:network
sudo snap connect solobase:home
```

#### Chocolatey (Windows)

```powershell
# Install using Chocolatey
choco install solobase
```

## Docker Installation

Run Solobase using Docker without installing it locally:

```bash
# Pull the latest image
docker pull solobase/solobase:latest

# Run with default settings
docker run -d \
  --name solobase \
  -p 8080:8080 \
  -v solobase_data:/app/data \
  solobase/solobase:latest

# Run with custom configuration
docker run -d \
  --name solobase \
  -p 8080:8080 \
  -v $(pwd)/config:/app/config \
  -v solobase_data:/app/data \
  -e DATABASE_URL="sqlite:///app/data/solobase.db" \
  solobase/solobase:latest
```

### Docker Compose

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
    volumes:
      - solobase_data:/app/data
      - ./config:/app/config
    restart: unless-stopped

volumes:
  solobase_data:
```

Then run:

```bash
docker-compose up -d
```

## Building from Source

If you prefer to build Solobase from source:

### Prerequisites

- Go 1.21 or later
- Node.js 18 or later
- Git

### Build Steps

```bash
# Clone the repository
git clone https://github.com/suppers-ai/solobase.git
cd solobase

# Install dependencies
go mod download
npm install

# Build the frontend
npm run build

# Build the binary
go build -o solobase ./cmd/solobase

# Install globally (optional)
sudo mv solobase /usr/local/bin/
```

## Verification

After installation, verify that Solobase is working correctly:

```bash
# Check version
solobase version

# Check help
solobase --help

# Initialize a new instance
solobase init

# Start the server
solobase serve
```

You should see output similar to:

```
Solobase v1.0.0
Starting server on http://localhost:8080
Database: SQLite (/home/user/.solobase/solobase.db)
Admin panel: http://localhost:8080/admin
```

## Next Steps

Now that Solobase is installed:

1. [Configure your instance](/docs/configuration/) with your preferred settings
2. Follow the [Quick Start Guide](/docs/quick-start/) to set up your first project
3. Explore the [Dashboard](/docs/dashboard/) to understand the interface

## Troubleshooting

### Permission Denied

If you get permission errors on Linux/macOS:

```bash
# Make the binary executable
chmod +x solobase

# Or install with sudo
sudo mv solobase /usr/local/bin/
```

### Port Already in Use

If port 8080 is already in use:

```bash
# Use a different port
solobase serve --port 8081

# Or set via environment variable
export PORT=8081
solobase serve
```

### Database Connection Issues

For database connection problems:

```bash
# Check database permissions
ls -la ~/.solobase/

# Reset database (WARNING: This will delete all data)
solobase reset --confirm

# Use a different database
solobase serve --database-url "postgres://user:pass@localhost/solobase"
```

## System Requirements

### Minimum Requirements

- **CPU**: 1 core, 1 GHz
- **RAM**: 512 MB
- **Storage**: 100 MB free space
- **OS**: Linux, macOS, or Windows

### Recommended Requirements

- **CPU**: 2+ cores, 2+ GHz
- **RAM**: 2+ GB
- **Storage**: 1+ GB free space
- **OS**: Recent version of Linux, macOS, or Windows

## Support

If you encounter issues during installation:

- Check our [Troubleshooting Guide](/docs/troubleshooting/)
- Search existing [GitHub Issues](https://github.com/suppers-ai/solobase/issues)
- Join our [Discord Community]({{ .Site.Params.discord_url }})
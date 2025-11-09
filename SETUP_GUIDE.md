# Solobase SaaS Platform Setup Guide

This guide walks you through setting up the complete Solobase SaaS platform from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: AWS Infrastructure Setup](#phase-1-aws-infrastructure-setup)
3. [Phase 2: Management Platform Setup](#phase-2-management-platform-setup)
4. [Phase 3: Stripe Configuration](#phase-3-stripe-configuration)
5. [Phase 4: Load Subscription Plans](#phase-4-load-subscription-plans)
6. [Phase 5: Deploy Instance Provisioner](#phase-5-deploy-instance-provisioner)
7. [Phase 6: Testing](#phase-6-testing)
8. [Phase 7: Production Deployment](#phase-7-production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- **AWS Account** with admin access
- **Stripe Account** (for payments)
- **Backblaze B2 Account** (for storage)
- **Domain** for management platform (e.g., manage.solobase.cloud)
- **Email service** (SMTP for notifications)

### Required Tools

```bash
# AWS CLI
aws --version  # >= 2.x

# Terraform
terraform -version  # >= 1.5

# Go (for building Solobase)
go version  # >= 1.21

# PostgreSQL client
psql --version  # >= 14

# Git
git --version
```

### Clone Repository

```bash
git clone https://github.com/suppers-ai/solobase-site
cd solobase-site

git clone https://github.com/suppers-ai/solobase
cd solobase
git checkout staging  # Use staging branch for latest features
```

---

## Phase 1: AWS Infrastructure Setup

### 1.1 Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1
```

### 1.2 Deploy Shared RDS Instance

This PostgreSQL instance will host databases for all customer instances on the Hobby and Starter plans.

```bash
cd solobase-site/terraform/modules/shared-rds

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Deploy
terraform apply

# Save the endpoint
export SHARED_RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
export SHARED_RDS_MASTER_USER=$(terraform output -raw master_username)
export SHARED_RDS_MASTER_PASS=$(terraform output -raw master_password)

echo "RDS Endpoint: $SHARED_RDS_ENDPOINT"
```

**Expected Output:**
```
rds_endpoint = "shared-solobase.xxxxx.us-east-1.rds.amazonaws.com"
master_username = "postgres"
master_password = "your-generated-password"
```

### 1.3 Create S3 Bucket for Lambda Binaries

```bash
aws s3 mb s3://solobase-lambda-binaries --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket solobase-lambda-binaries \
  --versioning-configuration Status=Enabled
```

### 1.4 Build and Upload Solobase Lambda Binary

```bash
cd solobase

# Build for Lambda (Linux x86_64)
GOOS=linux GOARCH=amd64 go build -o bootstrap cmd/solobase/main.go

# Zip the binary
zip solobase-lambda.zip bootstrap

# Upload to S3
aws s3 cp solobase-lambda.zip s3://solobase-lambda-binaries/v1.0.0/solobase-lambda.zip

echo "Lambda binary uploaded to S3"
```

### 1.5 Set Up Backblaze B2

```bash
# Install B2 CLI
pip install b2

# Authenticate
b2 authorize-account

# Create master bucket for management
b2 create-bucket solobase-management allPrivate
```

Save your B2 credentials:
```bash
export B2_KEY_ID="your_key_id"
export B2_APP_KEY="your_app_key"
```

---

## Phase 2: Management Platform Setup

### 2.1 Create Management Database

```bash
# Connect to shared RDS
psql -h $SHARED_RDS_ENDPOINT -U $SHARED_RDS_MASTER_USER -d postgres

# Create management database
CREATE DATABASE solobase_management;

# Create management user
CREATE USER solobase_mgmt WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE solobase_management TO solobase_mgmt;

\q
```

Save credentials:
```bash
export MANAGEMENT_DB_USER="solobase_mgmt"
export MANAGEMENT_DB_PASS="your-secure-password"
```

### 2.2 Configure Environment Variables

Create `.env` file in `solobase-site/`:

```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_HOST=shared-solobase.xxxxx.us-east-1.rds.amazonaws.com
DATABASE_USER=solobase_mgmt
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=solobase_management

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here
CSRF_SECRET=your-csrf-secret-here

# Admin Account
ADMIN_EMAIL=admin@solobase.cloud
ADMIN_PASSWORD=change-this-in-production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
SHARED_RDS_ENDPOINT=shared-solobase.xxxxx.us-east-1.rds.amazonaws.com
SHARED_RDS_MASTER_USER=postgres
SHARED_RDS_MASTER_PASS=your-rds-password

# Backblaze B2 Configuration
B2_KEY_ID=your-b2-key-id
B2_APP_KEY=your-b2-app-key

# Email Configuration (example with SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key

# CloudFront (optional - for signed URLs)
CLOUDFRONT_KEY_PAIR_ID=your-cloudfront-key-pair-id
CLOUDFRONT_PRIVATE_KEY=your-cloudfront-private-key

# Backup Configuration
BACKUP_S3_BUCKET=solobase-backups
EOF
```

### 2.3 Build Solobase with Extensions

```bash
cd solobase-site

# Copy instance provisioner extension to Solobase extensions directory
cp -r extensions/instance-provisioner ../solobase/extensions/

# Build Solobase with extensions
cd ../solobase
go build -tags="products instance-provisioner" -o solobase cmd/solobase/main.go

# Copy configuration
cp ../solobase-site/solobase.config.yml ./config.yml
```

### 2.4 Initialize Management Platform

```bash
# Run migrations
./solobase migrate --config=config.yml

# Start Solobase
./solobase start --config=config.yml
```

**Expected Output:**
```
[INFO] Starting Solobase Management Platform
[INFO] Database migrations completed
[INFO] Products extension enabled
[INFO] Instance provisioner extension enabled
[INFO] Server listening on :8090
[INFO] Admin user created: admin@solobase.cloud
```

### 2.5 Verify Setup

```bash
# Test API
curl http://localhost:8090/health

# Login as admin
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@solobase.cloud",
    "password": "change-this-in-production"
  }'

# Save token
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Phase 3: Stripe Configuration

### 3.1 Create Stripe Products

Go to [Stripe Dashboard](https://dashboard.stripe.com/products):

**Hobby Plan:**
```
Name: Hobby
Description: Perfect for personal projects
Price: $5.00 USD / month
Recurring: Monthly
```

**Starter Plan:**
```
Name: Starter
Description: Great for small teams
Price: $15.00 USD / month
Recurring: Monthly
```

**Professional Plan:**
```
Name: Professional
Description: For professional teams
Price: $79.00 USD / month
Recurring: Monthly
```

**Business Plan:**
```
Name: Business
Description: Enterprise-grade infrastructure
Price: $199.00 USD / month
Recurring: Monthly
```

### 3.2 Copy Price IDs

After creating products, copy the Price IDs (start with `price_`):

```bash
# Update products/subscription-plans.json with actual Stripe price IDs
# metadata.stripe_price_id = "price_1234567890abcdef"
```

### 3.3 Configure Stripe Webhook

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://manage.solobase.cloud/api/webhooks/stripe`
4. Description: "Solobase Products Webhook"
5. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. Click "Add endpoint"
7. Copy the **Signing secret** (starts with `whsec_`)
8. Update `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`

### 3.4 Test Stripe Webhook (Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8090/api/webhooks/stripe

# Test event
stripe trigger checkout.session.completed
```

---

## Phase 4: Load Subscription Plans

### 4.1 Update Plan Metadata

Edit `products/subscription-plans.json` and update `stripe_price_id` for each plan with the actual Price IDs from Stripe.

### 4.2 Load Plans into Database

```bash
cd solobase-site

# Load plans via API
curl -X POST http://localhost:8090/api/products/bulk \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @products/subscription-plans.json

# Verify plans loaded
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8090/api/products?type=subscription_plan
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_1",
      "type": "subscription_plan",
      "name": "Hobby",
      "price": 5.00,
      "metadata": {
        "stripe_price_id": "price_xxxxx",
        "quotas": {
          "instances": 1,
          "database_storage_mb": 500
        }
      }
    },
    ...
  ]
}
```

---

## Phase 5: Deploy Instance Provisioner

### 5.1 Verify Extension Loaded

```bash
# Check extensions status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8090/api/extensions

# Should show:
# - products (enabled)
# - instance-provisioner (enabled)
```

### 5.2 Test Provisioning Flow

```bash
# Create test instance manually
curl -X POST http://localhost:8090/api/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "instance",
    "name": "Test Instance",
    "metadata": {
      "user_id": "user_test",
      "subdomain": "test-instance",
      "status": "provisioning",
      "plan_id": "prod_1",
      "quotas": {
        "database_storage_mb": 500,
        "file_storage_gb": 2
      }
    }
  }'

# Monitor logs
tail -f logs/solobase.log

# Expected log output:
# [Instance Provisioner] Provisioning instance: prod_xxx (subdomain: test-instance)
# [prod_xxx] Step 1: Provisioning shared database
# [prod_xxx] Step 2: Provisioning Backblaze B2 storage
# [prod_xxx] Step 3: Provisioning Lambda function
# [prod_xxx] Step 4: Setting up CloudFront
# [prod_xxx] Step 5: Initializing Solobase
# [Instance Provisioner] Provisioning completed for prod_xxx

# Check instance status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8090/api/products/{instance_id}

# Should show status: "running" with resources populated
```

---

## Phase 6: Testing

### 6.1 Test Complete Signup Flow

1. **Visit Pricing Page:**
   ```
   http://localhost:8090/pricing
   ```

2. **Click "Get Started" on Hobby Plan**

3. **Redirects to Stripe Checkout** (test mode)

4. **Use Stripe Test Card:**
   ```
   Card: 4242 4242 4242 4242
   Exp: Any future date
   CVC: Any 3 digits
   ZIP: Any 5 digits
   ```

5. **Complete Payment**

6. **Stripe Webhook Fires:**
   - `checkout.session.completed`
   - Products extension creates subscription product
   - Products extension creates instance product (status: provisioning)

7. **Instance Provisioner Receives Event:**
   - Provisions AWS infrastructure
   - Updates instance status to "running"

8. **User Redirects to Dashboard:**
   ```
   http://localhost:8090/dashboard
   ```

9. **Verify Instance Shows Up:**
   - Status: "Running" (green badge)
   - URL: `https://subdomain.solobase.cloud`
   - Quotas displayed

### 6.2 Test Health Monitoring

```bash
# Wait 5 minutes for cron job

# Check logs for health checks
tail -f logs/solobase.log | grep "Health"

# Expected:
# [Instance Provisioner] Health check: instance_xxx is healthy
# [Instance Provisioner] Updated health status for instance_xxx
```

### 6.3 Test Dashboard Features

1. **View Instances:**
   - Lists all user instances
   - Shows status, URL, quotas
   - "Open Admin" button for running instances

2. **Create Instance:**
   - Fill form with subdomain, admin credentials
   - Submits to `/api/products`
   - Provisioning starts immediately

3. **Billing Tab:**
   - Shows current plan
   - Displays subscription price
   - Upgrade button (redirects to Stripe)

---

## Phase 7: Production Deployment

### 7.1 Deploy to Production Server

```bash
# On production server (Ubuntu/Debian)
sudo apt update
sudo apt install -y postgresql-client

# Clone repository
git clone https://github.com/suppers-ai/solobase-site
cd solobase-site

# Copy .env from secure storage
# (DO NOT commit .env to git!)

# Build Solobase
cd ../solobase
go build -tags="products instance-provisioner" -o solobase cmd/solobase/main.go

# Create systemd service
sudo tee /etc/systemd/system/solobase.service << 'EOF'
[Unit]
Description=Solobase Management Platform
After=network.target

[Service]
Type=simple
User=solobase
WorkingDirectory=/opt/solobase
EnvironmentFile=/opt/solobase/.env
ExecStart=/opt/solobase/solobase start --config=/opt/solobase/config.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable solobase
sudo systemctl start solobase

# Check status
sudo systemctl status solobase
```

### 7.2 Configure Nginx Reverse Proxy

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/solobase << 'EOF'
server {
    listen 80;
    server_name manage.solobase.cloud;

    location / {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/webhooks/stripe {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/solobase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d manage.solobase.cloud
```

### 7.3 Configure DNS

Add DNS records for your domain:

```
# Management platform
A record: manage.solobase.cloud → your-server-ip

# Wildcard for customer instances
A record: *.solobase.cloud → cloudfront (will be configured per instance)
CNAME record: *.solobase.cloud → CloudFront distribution domain
```

### 7.4 Update Stripe Webhook

Update webhook URL in Stripe Dashboard:
```
Old: http://localhost:8090/api/webhooks/stripe
New: https://manage.solobase.cloud/api/webhooks/stripe
```

### 7.5 Switch to Live Mode

Update `.env`:
```bash
# Change from test keys to live keys
STRIPE_SECRET_KEY=sk_live_xxxxx  # NOT sk_test_
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  # NOT pk_test_
```

Reload Solobase:
```bash
sudo systemctl restart solobase
```

---

## Phase 8: Monitoring & Maintenance

### 8.1 Set Up Monitoring

```bash
# View logs
sudo journalctl -u solobase -f

# Check metrics
curl https://manage.solobase.cloud/metrics

# Monitor RDS
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=shared-solobase \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### 8.2 Database Backups

Automated backups are configured in Terraform for RDS. Manual backup:

```bash
# Backup management database
pg_dump -h $DATABASE_HOST -U $DATABASE_USER solobase_management > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://solobase-backups/
```

### 8.3 Update Solobase Binary

```bash
# Build new version
cd solobase
git pull origin staging
GOOS=linux GOARCH=amd64 go build -o bootstrap cmd/solobase/main.go
zip solobase-lambda-v1.1.0.zip bootstrap

# Upload to S3
aws s3 cp solobase-lambda-v1.1.0.zip s3://solobase-lambda-binaries/v1.1.0/

# Update config to use new version
# Update all existing Lambda functions to new version (manual or script)
```

---

## Troubleshooting

### Issue: RDS Connection Timeout

**Symptoms:**
```
Failed to connect to database: timeout
```

**Solution:**
```bash
# Check security group allows access
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Add inbound rule for your IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr your-ip/32
```

### Issue: Stripe Webhook Returns 401

**Symptoms:**
```
[ERROR] Stripe webhook signature verification failed
```

**Solution:**
```bash
# Verify webhook secret is correct
echo $STRIPE_WEBHOOK_SECRET

# Test webhook locally
stripe listen --forward-to localhost:8090/api/webhooks/stripe
stripe trigger checkout.session.completed

# Check webhook logs in Stripe Dashboard
```

### Issue: Instance Provisioning Fails

**Symptoms:**
```
Instance status stuck on "provisioning" or changes to "error"
```

**Solution:**
```bash
# Check provisioner logs
tail -f logs/solobase.log | grep "Instance Provisioner"

# Verify AWS credentials
aws sts get-caller-identity

# Check RDS master credentials
psql -h $SHARED_RDS_ENDPOINT -U $SHARED_RDS_MASTER_USER -d postgres -c "SELECT 1;"

# Verify B2 credentials
b2 list-buckets

# Manually retry provisioning
curl -X PUT http://localhost:8090/api/products/{instance_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"metadata": {"status": "provisioning"}}'
```

### Issue: Lambda Function Not Working

**Symptoms:**
```
Customer instance URL returns 502/503
```

**Solution:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/solobase-{instance_id} --follow

# Test Lambda directly
curl https://{function-id}.lambda-url.us-east-1.on.aws/health

# Check environment variables
aws lambda get-function-configuration --function-name solobase-{instance_id}

# Verify database connection from Lambda
```

### Issue: Dashboard Not Loading Instances

**Symptoms:**
```
Dashboard shows "Failed to load instances"
```

**Solution:**
```bash
# Check browser console for errors
# F12 → Console

# Verify API endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/products?type=instance

# Check CORS configuration in solobase.config.yml
# Ensure allowed_origins includes your frontend domain

# Verify JWT token is valid
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/auth/me
```

---

## Next Steps

1. **Load Test:**
   - Simulate 100 concurrent signups
   - Monitor RDS connections, Lambda cold starts
   - Verify provisioning completes successfully

2. **Security Audit:**
   - Review IAM permissions (principle of least privilege)
   - Enable AWS CloudTrail for audit logging
   - Set up security scanning (e.g., Snyk, Dependabot)

3. **Cost Optimization:**
   - Monitor AWS costs with Cost Explorer
   - Set up billing alerts
   - Review RDS instance size after 1 month

4. **Customer Support:**
   - Set up helpdesk (e.g., Zendesk, Intercom)
   - Create knowledge base
   - Train support team on common issues

5. **Marketing:**
   - Launch homepage
   - SEO optimization
   - Content marketing strategy

---

## Support

- **Documentation:** https://docs.solobase.cloud
- **GitHub Issues:** https://github.com/suppers-ai/solobase-site/issues
- **Email:** support@solobase.cloud
- **Discord:** https://discord.gg/solobase

---

## Appendix

### A. Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_HOST` | Yes | PostgreSQL host | `xxx.rds.amazonaws.com` |
| `DATABASE_USER` | Yes | Database username | `solobase_mgmt` |
| `DATABASE_PASSWORD` | Yes | Database password | `secure-password` |
| `JWT_SECRET` | Yes | JWT signing secret | `256-bit-key` |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key | `sk_live_xxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook secret | `whsec_xxxxx` |
| `AWS_REGION` | Yes | AWS region | `us-east-1` |
| `SHARED_RDS_ENDPOINT` | Yes | Shared RDS endpoint | `xxx.rds.amazonaws.com` |
| `B2_KEY_ID` | Yes | Backblaze key ID | `xxx` |
| `B2_APP_KEY` | Yes | Backblaze app key | `xxx` |
| `ADMIN_EMAIL` | Yes | Admin account email | `admin@example.com` |
| `ADMIN_PASSWORD` | Yes | Admin account password | `change-this` |

### B. Port Reference

| Port | Service | Description |
|------|---------|-------------|
| 8090 | Solobase Management | Main application |
| 5432 | PostgreSQL | RDS database |
| 80 | Nginx | HTTP (redirects to HTTPS) |
| 443 | Nginx | HTTPS |

### C. Cost Calculator

Monthly costs for 100 customers (Hobby plan):

| Resource | Cost |
|----------|------|
| RDS (db.t3.medium) | $62 |
| Lambda (1M requests) | $0.20 |
| Backblaze B2 (200GB) | $1.00 |
| CloudFront (100GB) | $8.50 |
| **Total Cost** | **$71.70** |
| **Revenue** (100 × $5) | **$500** |
| **Profit** | **$428.30** (86%) |

Congratulations! Your Solobase SaaS platform is now live. 🎉

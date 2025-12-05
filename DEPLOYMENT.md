# Solobase SaaS Platform - Deployment Guide

This guide covers deploying the complete Solobase SaaS platform, which allows customers to provision and manage their own Solobase instances.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLOBASE SAAS PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐                                           │
│  │  Static Site     │   Hugo-based marketing site                │
│  │  (Hugo)          │   - Pricing page                           │
│  │  ├─ Pricing      │   - Documentation                          │
│  │  ├─ Docs         │   - Dashboard (HTML/JS)                    │
│  │  └─ Dashboard    │                                            │
│  └────────┬─────────┘                                            │
│           │                                                       │
│           ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Management Backend (Solobase Instance)                   │  │
│  │  ├─ User Authentication                                   │  │
│  │  ├─ Subscription Management (Stripe)                      │  │
│  │  ├─ Instance Provisioning Service                         │  │
│  │  ├─ Usage Tracking & Analytics                            │  │
│  │  └─ Admin Dashboard                                       │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                       │
│           ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AWS Infrastructure                                        │  │
│  │  ├─ Shared RDS PostgreSQL (customer databases)            │  │
│  │  ├─ Lambda Functions (customer instances)                 │  │
│  │  ├─ Backblaze B2 (storage buckets)                        │  │
│  │  └─ CloudFront (CDN + custom domains)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Accounts
- [ ] AWS Account with administrator access
- [ ] Backblaze B2 Account
- [ ] Stripe Account
- [ ] Domain name (e.g., solobase.dev)
- [ ] DNS provider (Cloudflare recommended)

### Development Tools
- [ ] Go 1.21+
- [ ] Node.js 18+
- [ ] PostgreSQL 15+
- [ ] Terraform 1.5+
- [ ] Hugo 0.120+
- [ ] AWS CLI
- [ ] Git

## Phase 1: Infrastructure Setup (1-2 days)

### 1.1 AWS Account Setup

```bash
# Configure AWS CLI
aws configure

# Create S3 bucket for Terraform state
aws s3 mb s3://solobase-terraform-state --region us-east-1

# Create DynamoDB table for Terraform state locking
aws dynamodb create-table --table-name solobase-terraform-locks --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
```

### 1.2 Backblaze B2 Setup

1. Create Backblaze B2 account
2. Generate master application key
3. Note Key ID and Application Key
4. Test S3 compatibility:

```bash
# Install AWS CLI if not already
pip install awscli

# Configure B2 credentials
aws configure --profile b2
# AWS Access Key ID: <B2 Key ID>
# AWS Secret Access Key: <B2 Application Key>
# Default region name: us-east-005

# Test bucket creation
aws s3 mb s3://test-bucket --endpoint-url=https://s3.us-east-005.backblazeb2.com --profile b2
```

### 1.3 Stripe Setup

1. Create Stripe account
2. Get API keys (test and live)
3. Create products and prices:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create products
# Create price for Hobby plan
# Repeat for all plans (Starter, Professional, Business)
```

## Phase 2: Deploy Infrastructure (2-3 days)

### 2.1 VPC and Networking

```bash
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Deploy VPC
terraform apply -target=module.vpc
```

### 2.2 Deploy Shared RDS

```bash
# Deploy shared RDS instance
terraform apply -target=module.shared_rds_01

# Wait for RDS to be available (5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier solobase-shared-prod-01

# Get RDS endpoint
terraform output shared_rds_endpoint
```

### 2.3 Initialize Management Database

```bash
# Copy database URL from Terraform output
export DATABASE_URL="postgresql://solobase_master:password@shared-rds-01.amazonaws.com:5432/postgres"

# Create management database
createdb -h <rds-endpoint> -U solobase_master solobase_saas

# Run migrations
psql $DATABASE_URL -f backend/database/schema/001_initial_schema.sql

# Seed data
psql $DATABASE_URL -f backend/database/seeds/001_plans.sql
```

### 2.4 Package and Deploy Solobase Binary

```bash
# Clone Solobase repository
git clone https://github.com/suppers-ai/solobase.git
cd solobase

# Build for Lambda (Linux x86_64)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bootstrap cmd/solobase/main.go

# Package as ZIP
zip solobase-latest.zip bootstrap

# Upload to S3
aws s3 cp solobase-latest.zip s3://solobase-lambda-binaries/
```

## Phase 3: Deploy Management Platform (1-2 days)

### 3.1 Build and Deploy Backend

```bash
cd backend

# Install dependencies
go mod download

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Build backend
go build -o solobase-saas cmd/main.go

# Run migrations
./solobase-saas migrate

# Start server
./solobase-saas serve
```

### 3.2 Deploy as ECS Service (Production)

```bash
# Build Docker image
docker build -t solobase-saas:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag solobase-saas:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/solobase-saas:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/solobase-saas:latest

# Deploy ECS service
terraform apply -target=module.management_platform
```

### 3.3 Build and Deploy Static Site

```bash
# Install Hugo
brew install hugo

# Build static site
cd ../
hugo --minify

# Deploy to S3 + CloudFront
aws s3 sync public/ s3://solobase-static-site/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123456789 --paths "/*"
```

## Phase 4: Configure Stripe Webhooks (1 hour)

```bash
# Set up webhook endpoint
stripe listen --forward-to https://api.solobase.dev/webhooks/stripe

# In Stripe Dashboard, create webhook endpoint:
# URL: https://api.solobase.dev/webhooks/stripe
# Events to send:
# - invoice.paid
# - invoice.payment_failed
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted

# Get webhook signing secret
# Add to .env as STRIPE_WEBHOOK_SECRET
```

## Phase 5: DNS Configuration (1 hour)

### 5.1 Main Domain (solobase.dev)

```
Type    Name                Value                           TTL
A       @                   <CloudFront IP>                 Auto
A       api                 <ALB DNS>                       Auto
CNAME   www                 solobase.dev                    Auto
TXT     @                   "v=spf1 include:sendgrid.net ~all"  Auto
```

### 5.2 Customer Instance Domain (solobase.cloud)

```
Type    Name                Value                           TTL
A       @                   <Placeholder IP>                Auto
CNAME   *                   <CloudFront distribution>       Auto
```

## Phase 6: Testing (1 day)

### 6.1 End-to-End Test

```bash
# 1. Sign up for account
curl -X POST https://api.solobase.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# 2. Create checkout session
curl -X POST https://api.solobase.dev/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"plan_id":"hobby","billing_cycle":"monthly"}'

# 3. Complete Stripe checkout (in browser)

# 4. Create instance
curl -X POST https://api.solobase.dev/api/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Instance","subdomain":"test","admin_email":"admin@test.com","admin_password":"password123"}'

# 5. Wait for provisioning (8-12 minutes)

# 6. Test instance
curl https://test.solobase.cloud/health
```

### 6.2 Load Testing

```bash
# Install k6
brew install k6

# Create load test script
cat > load-test.js << EOF
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let res = http.get('https://api.solobase.dev/api/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
}
EOF

# Run load test
k6 run load-test.js
```

## Phase 7: Monitoring Setup (1 day)

### 7.1 CloudWatch Dashboards

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name Solobase-Production \
  --dashboard-body file://dashboards/production.json
```

### 7.2 Set Up Alerts

```bash
# Create SNS topic for alerts
aws sns create-topic --name solobase-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:solobase-alerts \
  --protocol email \
  --notification-endpoint alerts@solobase.dev

# CloudWatch alarms are created by Terraform
```

### 7.3 Set Up Sentry

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create new project in Sentry dashboard
# Add DSN to .env

# Test error reporting
sentry-cli send-event -m "Test error" --env production
```

## Phase 8: Security Hardening (1 day)

### 8.1 Enable AWS GuardDuty

```bash
aws guardduty create-detector --enable
```

### 8.2 Enable AWS Security Hub

```bash
aws securityhub enable-security-hub
```

### 8.3 Implement Rate Limiting

Already implemented in backend. Verify:
- API: 100 requests/minute per IP
- Signup: 3 requests/hour per IP
- Login: 5 requests/15 minutes per IP

### 8.4 Enable WAF (Web Application Firewall)

```bash
terraform apply -target=module.waf
```

## Phase 9: Launch Checklist

- [ ] All Terraform infrastructure deployed
- [ ] Shared RDS healthy and accepting connections
- [ ] Management backend deployed and responding
- [ ] Static site deployed and accessible
- [ ] DNS configured correctly
- [ ] SSL certificates issued
- [ ] Stripe integration working
- [ ] Email sending configured
- [ ] Monitoring and alerts active
- [ ] Backups configured
- [ ] Security hardening complete
- [ ] Load testing passed
- [ ] Documentation updated
- [ ] Team trained on operations

## Ongoing Operations

### Daily Tasks
- Monitor CloudWatch dashboards
- Check error logs
- Review Stripe transactions

### Weekly Tasks
- Review usage metrics
- Check RDS capacity
- Review support tickets
- Update documentation

### Monthly Tasks
- Security updates
- Cost optimization review
- Performance analysis
- Backup testing
- Disaster recovery drill

## Cost Management

### Expected Monthly Costs (100 customers)

**Fixed Costs:**
- Shared RDS (db.t3.medium, Multi-AZ): $120
- Management Platform (ECS): $50
- CloudWatch: $20
- Total Fixed: $190/month

**Variable Costs (per customer):**
- Lambda execution: $0.40
- Backblaze B2 storage: $0.01
- CloudFront: $1.00
- Total per customer: ~$1.50/month

**Total for 100 customers:**
- Fixed: $190
- Variable: $150
- **Total: $340/month**

**Revenue (100 customers at $10 avg):**
- $1,000/month

**Profit Margin:**
- $660/month (66%)

### Cost Optimization Tips

1. Use Reserved Instances for RDS (save 40%)
2. Enable S3 Intelligent-Tiering for backups
3. Optimize Lambda memory allocation
4. Use CloudFront caching aggressively
5. Archive old logs to Glacier

## Troubleshooting

### Instance Provisioning Fails

```bash
# Check provisioning logs
aws logs tail /aws/lambda/provisioning-service --follow

# Check shared RDS capacity
psql $DATABASE_URL -c "SELECT * FROM shared_rds_instances"

# Manually provision
cd backend
go run cmd/provision/main.go --instance-id=<uuid>
```

### Database Connection Issues

```bash
# Test RDS connection
psql "postgresql://user:pass@rds-endpoint:5432/dbname"

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

### Lambda Cold Start Issues

```bash
# Enable provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name solobase-abc123 \
  --provisioned-concurrent-executions 1

# Monitor performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=solobase-abc123 \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

## Support

- Documentation: https://docs.solobase.dev
- Discord: https://discord.gg/jKqMcbrVzm
- Email: support@solobase.dev
- GitHub Issues: https://github.com/suppers-ai/solobase-site/issues

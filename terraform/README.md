# Solobase SaaS Infrastructure (Terraform)

This directory contains Terraform configurations for deploying the Solobase SaaS platform infrastructure on AWS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐     ┌─────────────────────────┐  │
│  │  Management Platform  │     │  Customer Instances     │  │
│  │  (Solobase)          │     │  (Lambda + RDS + B2)    │  │
│  ├──────────────────────┤     ├─────────────────────────┤  │
│  │ - ECS Fargate        │     │ - Lambda Functions      │  │
│  │ - RDS PostgreSQL     │     │ - Shared RDS (multi-    │  │
│  │ - Application LB     │     │   tenant databases)     │  │
│  │ - CloudWatch         │     │ - Backblaze B2          │  │
│  └──────────────────────┘     │ - CloudFront            │  │
│                                └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Modules

### 1. `modules/shared-rds/`
Creates a shared RDS PostgreSQL instance for hosting multiple customer databases.

**Features:**
- PostgreSQL 15.4
- Auto-scaling storage (100GB - 500GB)
- Automated backups (7-day retention)
- Performance Insights
- CloudWatch monitoring and alarms
- Connection pooling configuration (max 300 connections)

**Usage:**
```hcl
module "shared_rds" {
  source = "./modules/shared-rds"

  environment              = "prod"
  instance_identifier      = "solobase-shared-prod-01"
  instance_class           = "db.t3.medium"
  allocated_storage        = 100
  max_allocated_storage    = 500
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks      = ["10.0.0.0/16"]
}
```

### 2. `modules/instance-lambda/`
Creates a Lambda function for a customer Solobase instance.

**Features:**
- Custom runtime for Go binary
- Lambda Function URL (no API Gateway needed)
- CloudWatch logs and alarms
- IAM role with minimal permissions
- Environment variable configuration
- Reserved concurrency (cost protection)

**Usage:**
```hcl
module "customer_instance" {
  source = "./modules/instance-lambda"

  instance_id               = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  subdomain                 = "myapp"
  environment               = "prod"
  solobase_binary_s3_bucket = "solobase-binaries"
  solobase_binary_s3_key    = "solobase-v0.1.0.zip"
  database_url              = "postgresql://user:pass@host:5432/db"
  b2_bucket_name            = "solobase-a1b2c3d4"
  b2_endpoint               = "https://s3.us-east-005.backblazeb2.com"
  b2_key_id                 = var.b2_key_id
  b2_app_key                = var.b2_app_key
  memory_size               = 512
  timeout                   = 30
}
```

## Directory Structure

```
terraform/
├── modules/
│   ├── shared-rds/          # Shared RDS PostgreSQL instance
│   ├── instance-lambda/     # Customer Lambda instance
│   ├── instance-ecs/        # Customer ECS instance (for Professional+)
│   ├── cloudfront/          # CloudFront distribution
│   ├── management-platform/ # Management platform (ECS + RDS + ALB)
│   └── vpc/                 # VPC and networking
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── backend.tf               # Terraform state backend config
└── README.md
```

## Prerequisites

1. **AWS Account** with administrator access
2. **Terraform** >= 1.5.0
3. **AWS CLI** configured with credentials
4. **Backblaze B2 Account** for storage
5. **S3 Bucket** for Terraform state
6. **Solobase Binary** packaged for Lambda

## Getting Started

### 1. Configure Backend

Create `backend.tf`:
```hcl
terraform {
  backend "s3" {
    bucket         = "solobase-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "solobase-terraform-locks"
    encrypt        = true
  }
}
```

### 2. Package Solobase for Lambda

```bash
# Build Solobase for Lambda (Linux x86_64)
GOOS=linux GOARCH=amd64 go build -o bootstrap cmd/solobase/main.go

# Package as ZIP
zip solobase-latest.zip bootstrap

# Upload to S3
aws s3 cp solobase-latest.zip s3://solobase-binaries/
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
cd terraform/environments/prod
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply
```

## Environment Configuration

### Development
- Shared RDS: `db.t3.small` (single-AZ)
- Lambda: 256MB memory
- No backups
- CloudWatch logs: 3-day retention

### Production
- Shared RDS: `db.t3.medium` (Multi-AZ)
- Lambda: 512MB memory
- Automated backups: 7 days
- CloudWatch logs: 30-day retention
- Performance Insights enabled

## Cost Estimation

### Shared Infrastructure (per month)

**Development:**
- Shared RDS (db.t3.small): $30
- CloudWatch Logs: $5
- **Total: ~$35/month**

**Production:**
- Shared RDS (db.t3.medium, Multi-AZ): $120
- CloudWatch Logs: $20
- CloudWatch Alarms: $1
- **Total: ~$141/month**

### Per Customer Instance (Hobby/Starter)

- Lambda (1M requests, 512MB, 200ms): $0.40
- CloudFront: $1.00
- CloudWatch Logs: $0.50
- Backblaze B2 (2GB): $0.01
- **Total: ~$2/month**

### Capacity

One `db.t3.medium` shared RDS can support:
- 100-150 customer databases
- ~30,000 concurrent connections
- 500GB total storage

**Break-even:** Need 15 paying customers to cover infrastructure costs.

## Monitoring

### CloudWatch Dashboards

Create custom dashboards:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name "Solobase-Production" \
  --dashboard-body file://dashboards/production.json
```

### Metrics to Monitor

**Shared RDS:**
- CPU Utilization (< 80%)
- Database Connections (< 250)
- Free Storage Space (> 10 GB)
- Read/Write Latency

**Lambda Functions:**
- Invocations
- Errors
- Throttles
- Duration
- Concurrent Executions

### Alarms

Set up SNS topics for critical alerts:
```hcl
resource "aws_sns_topic" "alerts" {
  name = "solobase-infrastructure-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "alerts@solobase.dev"
}
```

## Scaling Strategy

### Shared RDS Scaling

**Vertical Scaling:**
1. When CPU > 70% for 24h → Upgrade instance class
2. When storage > 80% → Auto-scaling handles it

**Horizontal Scaling:**
1. When databases > 120 → Spin up new shared RDS instance
2. Route new customers to new instance
3. Optionally migrate some databases

### Lambda Scaling

Lambda auto-scales based on traffic:
- Set reserved concurrency per plan (Hobby: 5, Starter: 10, Pro: 25)
- Monitor throttles and adjust as needed

### Database Migration (Shared → Dedicated)

When upgrading from Professional to Business plan:

```bash
# 1. Dump database
pg_dump -h shared-rds.amazonaws.com -U user_abc123 instance_abc123 > backup.sql

# 2. Create dedicated RDS
terraform apply -target=module.dedicated_rds

# 3. Restore database
psql -h dedicated-rds.amazonaws.com -U solobase_admin solobase < backup.sql

# 4. Update instance config
# 5. Drop database from shared RDS
```

## Security Best Practices

1. **Secrets Management:**
   - Store database passwords in AWS Secrets Manager
   - Rotate credentials every 90 days
   - Use IAM roles instead of access keys

2. **Network Security:**
   - RDS in private subnets only
   - Security groups with minimal permissions
   - Use VPC endpoints for AWS services

3. **Encryption:**
   - Enable RDS encryption at rest
   - Use SSL/TLS for database connections
   - Encrypt Secrets Manager secrets

4. **Monitoring:**
   - Enable CloudTrail for API logging
   - Set up alerts for suspicious activity
   - Regular security audits

## Disaster Recovery

### Backup Strategy

**RDS Automated Backups:**
- Frequency: Daily
- Retention: 7 days (dev), 30 days (prod)
- Cross-region snapshots for production

**Manual Backups:**
```bash
# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier solobase-shared-prod-01 \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

### Recovery Procedures

**Shared RDS Failure:**
1. Create new RDS from latest snapshot
2. Update DNS/endpoints
3. Test connectivity
4. Update instance configs

**Lambda Function Failure:**
1. Check CloudWatch Logs for errors
2. Redeploy Lambda function
3. Test Function URL

## Troubleshooting

### RDS Connection Issues
```bash
# Test connection
psql "postgresql://user:pass@shared-rds.amazonaws.com:5432/dbname"

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Check subnet groups
aws rds describe-db-subnet-groups
```

### Lambda Timeout Issues
```bash
# View logs
aws logs tail /aws/lambda/solobase-abc123 --follow

# Increase timeout
terraform apply -var="lambda_timeout=60"
```

### Out of Database Connections
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'instance_abc123'
  AND state = 'idle'
  AND state_change < now() - interval '10 minutes';
```

## Contributing

When adding new infrastructure:
1. Create module in `modules/`
2. Add example in module README
3. Test in dev environment
4. Document variables and outputs
5. Submit PR for review

## Support

For infrastructure issues:
- Check CloudWatch Logs
- Review Terraform state
- Contact DevOps team: devops@solobase.dev

# Solobase SaaS Database Schema

This directory contains the database schema and seed data for the Solobase SaaS management platform.

## Overview

The management platform uses its own Solobase instance with PostgreSQL to manage:
- User accounts and authentication
- Subscriptions and billing
- Customer instances
- Usage tracking and analytics
- Support tickets

## Schema Files

### `schema/001_initial_schema.sql`
The complete database schema including all tables, indexes, and relationships.

**Key Tables:**
- `users` - User accounts (managed by Solobase auth)
- `subscriptions` - User subscription plans and Stripe integration
- `plans` - Available pricing plans
- `instances` - Customer Solobase instances
- `shared_rds_instances` - Shared RDS capacity management
- `instance_usage` - Daily usage metrics for billing
- `instance_logs` - Instance logs and errors
- `transactions` - Payment transactions
- `invoices` - Generated invoices
- `backups` - Instance backups

### `seeds/001_plans.sql`
Initial data for the pricing plans.

## Running Migrations

### Option 1: Using Solobase CLI

```bash
# Initialize the management database
solobase db init

# Run migrations
psql $DATABASE_URL -f schema/001_initial_schema.sql

# Seed data
psql $DATABASE_URL -f seeds/001_plans.sql
```

### Option 2: Using psql directly

```bash
# Set your database connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/solobase_saas"

# Create database
createdb solobase_saas

# Run schema
psql $DATABASE_URL -f schema/001_initial_schema.sql

# Run seeds
psql $DATABASE_URL -f seeds/001_plans.sql
```

### Option 3: Using Docker

```bash
# Start PostgreSQL
docker run -d \
  --name solobase-postgres \
  -e POSTGRES_DB=solobase_saas \
  -e POSTGRES_USER=solobase \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15

# Run migrations
docker exec -i solobase-postgres psql -U solobase -d solobase_saas < schema/001_initial_schema.sql
docker exec -i solobase-postgres psql -U solobase -d solobase_saas < seeds/001_plans.sql
```

## Multi-Tenant Database Architecture

### Shared Tier (Hobby, Starter, Professional)

Customer instances share a single RDS PostgreSQL instance but have **separate databases**:

```
shared-rds-instance.amazonaws.com
├── instance_a1b2c3d4 (Customer 1 database)
├── instance_e5f6g7h8 (Customer 2 database)
├── instance_i9j0k1l2 (Customer 3 database)
└── ... (up to 150 databases)
```

**Benefits:**
- Cost-effective for small instances
- Full data isolation (separate databases)
- Easy to migrate to dedicated tier
- Supports 100-150 instances per RDS

**Capacity Management:**
The `shared_rds_instances` table tracks capacity:
- When reaching 80% capacity (120 databases), create new shared RDS
- Monitor total storage across all databases
- Health checks every 5 minutes

### Dedicated Tier (Business, Enterprise)

Each customer gets their own RDS instance:
- Full control and isolation
- Better performance
- Dedicated resources
- Point-in-time recovery

## Instance Provisioning Flow

```sql
-- 1. Find available shared RDS
SELECT * FROM shared_rds_instances
WHERE status = 'active'
  AND current_databases < max_databases
ORDER BY current_databases ASC
LIMIT 1;

-- 2. Create instance record
INSERT INTO instances (
  user_id, name, subdomain, status,
  database_tier, compute_tier,
  shared_rds_id, database_name, database_user
) VALUES (
  $user_id, $name, $subdomain, 'provisioning',
  'shared', 'lambda',
  $shared_rds_id, $db_name, $db_user
);

-- 3. Update shared RDS capacity
UPDATE shared_rds_instances
SET current_databases = current_databases + 1
WHERE id = $shared_rds_id;

-- 4. Log event
INSERT INTO instance_events (
  instance_id, user_id, event_type, description
) VALUES (
  $instance_id, $user_id, 'created', 'Instance provisioning started'
);
```

## Usage Tracking

Daily usage is tracked in `instance_usage`:

```sql
-- Record daily usage
INSERT INTO instance_usage (
  instance_id, date,
  api_requests, storage_bytes, database_bytes,
  compute_hours, total_cost
) VALUES (
  $instance_id, CURRENT_DATE,
  $api_requests, $storage_bytes, $database_bytes,
  $compute_hours, $total_cost
)
ON CONFLICT (instance_id, date)
DO UPDATE SET
  api_requests = instance_usage.api_requests + EXCLUDED.api_requests,
  storage_bytes = EXCLUDED.storage_bytes,
  database_bytes = EXCLUDED.database_bytes;
```

## Monitoring Queries

### Check shared RDS capacity:
```sql
SELECT
  rds_instance_id,
  current_databases,
  max_databases,
  ROUND(100.0 * current_databases / max_databases, 2) as usage_percentage,
  storage_used_gb,
  storage_total_gb,
  status
FROM shared_rds_instances
ORDER BY usage_percentage DESC;
```

### Find instances approaching quota:
```sql
SELECT
  i.id,
  i.name,
  i.subdomain,
  u.email,
  i.storage_used_bytes / 1073741824.0 as storage_gb,
  i.storage_quota_gb,
  i.api_requests_today,
  i.api_requests_quota_daily
FROM instances i
JOIN users u ON i.user_id = u.id
WHERE
  (i.storage_used_bytes > i.storage_quota_gb * 1073741824 * 0.9)
  OR (i.api_requests_today > i.api_requests_quota_daily * 0.9)
ORDER BY u.email;
```

### Monthly revenue report:
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as transactions,
  SUM(amount) / 100.0 as revenue_usd,
  COUNT(DISTINCT user_id) as unique_customers
FROM transactions
WHERE status = 'succeeded'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

## Backup Strategy

### Automatic Backups

**Shared RDS:**
- Automated snapshots every 24 hours
- Retention: 7 days
- Point-in-time recovery: 5 minutes

**Dedicated RDS:**
- Automated snapshots every 6 hours (Professional+)
- Retention: 30 days
- Point-in-time recovery: 1 minute

### Manual Backups

```sql
-- Create manual backup entry
INSERT INTO backups (
  instance_id, backup_type, status
) VALUES (
  $instance_id, 'manual', 'in_progress'
);

-- After backup completes
UPDATE backups
SET
  status = 'completed',
  size_bytes = $size,
  s3_bucket = $bucket,
  s3_key = $key,
  completed_at = CURRENT_TIMESTAMP,
  expires_at = CURRENT_TIMESTAMP + INTERVAL '90 days'
WHERE id = $backup_id;
```

## Security Considerations

1. **Password Hashing**: All passwords use bcrypt
2. **Secrets Management**: Database credentials stored in AWS Secrets Manager
3. **Encryption**: All sensitive fields (passwords, API keys) are encrypted
4. **Row-level Security**: Consider enabling RLS for multi-tenant isolation
5. **Audit Logging**: All instance events are logged in `instance_events`

## Performance Optimization

### Connection Pooling

For shared RDS instances, use PgBouncer:
- Transaction pooling mode
- Max connections: 100 per database
- Pool size: 20

### Indexing Strategy

All foreign keys are indexed for join performance.
Additional indexes on:
- `instances.status` - for filtering
- `instance_logs.created_at` - for time-based queries
- `instance_usage.date` - for analytics

### Archiving Old Data

```sql
-- Archive logs older than 90 days
DELETE FROM instance_logs
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Archive usage data older than 2 years
DELETE FROM instance_usage
WHERE date < CURRENT_DATE - INTERVAL '2 years';
```

## Development

For local development:

```bash
# Use Docker Compose
docker-compose up -d postgres

# Or use local PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Create development database
createdb solobase_saas_dev

# Run migrations
psql solobase_saas_dev -f schema/001_initial_schema.sql
psql solobase_saas_dev -f seeds/001_plans.sql
```

## Production Deployment

1. **RDS Setup**:
   - PostgreSQL 15+
   - Multi-AZ for production
   - Automated backups enabled
   - Encryption at rest

2. **Run Migrations**:
   ```bash
   # Using Terraform or manual
   psql $PROD_DATABASE_URL -f schema/001_initial_schema.sql
   psql $PROD_DATABASE_URL -f seeds/001_plans.sql
   ```

3. **Setup Monitoring**:
   - CloudWatch alarms for connection count
   - Slow query logging
   - Database size alerts

4. **Backup Verification**:
   - Test restore process monthly
   - Verify backup integrity

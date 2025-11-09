# Solobase Products Configuration

This directory contains product definitions for the Solobase SaaS platform. We use the built-in Solobase **Products Extension** with **Stripe provider** to manage subscriptions and instances.

## Product Types

### 1. Subscription Plans (`subscription_plan`)

Defines the pricing tiers that customers can subscribe to. Each plan includes:

- **Pricing**: Monthly price and currency
- **Features**: Human-readable list of features
- **Quotas**: Resource limits (storage, bandwidth, instances, etc.)
- **Limits**: Technical constraints (connections, file sizes, timeouts)

**File**: `subscription-plans.json`

Plans:
- **Hobby**: $5/month - Personal projects
- **Starter**: $15/month - Small teams (POPULAR)
- **Professional**: $79/month - Professional teams
- **Business**: $199/month - Enterprise-grade

### 2. Instances (`instance`)

Represents a customer's Solobase instance. Created automatically when:
1. Customer completes Stripe checkout
2. Products extension creates instance product
3. Instance provisioner extension receives `product.created` event
4. Infrastructure is provisioned (Lambda, RDS, B2, CloudFront)
5. Instance status updated from `provisioning` → `running`

**File**: `instance-template.json`

## How It Works

### Flow: Customer Signs Up

```
1. Customer clicks "Get Started" on pricing page
   ↓
2. Frontend calls: POST /api/products/checkout
   Body: { plan_id: "plan_123", subdomain: "acme" }
   ↓
3. Products extension creates Stripe Checkout Session
   ↓
4. Customer completes payment on Stripe
   ↓
5. Stripe webhook: checkout.session.completed
   ↓
6. Products extension creates two products:
   - Subscription product (linked to Stripe subscription)
   - Instance product (status: "provisioning")
   ↓
7. Instance provisioner receives product.created event
   ↓
8. Provisioner creates AWS infrastructure:
   - PostgreSQL database (shared RDS)
   - Backblaze B2 bucket
   - Lambda function
   - CloudFront distribution
   ↓
9. Provisioner updates instance product:
   - status: "running"
   - resources: { lambda_arn, cloudfront_domain, url, ... }
   ↓
10. Customer receives email with instance URL
```

### Flow: Customer Views Dashboard

```
1. Customer logs in to manage.solobase.cloud
   ↓
2. Dashboard calls: GET /api/products?type=instance&user_id={user_id}
   ↓
3. Products extension returns all instances for user
   ↓
4. Dashboard displays instances with status, URL, quotas
```

### Flow: Health Monitoring

```
1. Cron job triggers every 5 minutes
   ↓
2. Instance provisioner receives cron event
   ↓
3. Provisioner checks all running instances:
   - GET {lambda_url}/health
   - Check RDS connection
   - Check B2 bucket status
   ↓
4. Update instance product metadata:
   - last_health_check: timestamp
   - health_status: "healthy" | "unhealthy"
```

## Product Schema

### Subscription Plan Schema

```json
{
  "type": "subscription_plan",
  "name": "Plan Name",
  "description": "Plan description",
  "price": 15.00,
  "currency": "USD",
  "interval": "month",
  "active": true,
  "metadata": {
    "stripe_price_id": "price_xxx",
    "display_order": 1,
    "popular": true,
    "features": ["Feature 1", "Feature 2"],
    "quotas": {
      "instances": 3,
      "database_storage_mb": 2048,
      "file_storage_gb": 10,
      "bandwidth_gb": 50,
      "api_requests_per_day": 50000,
      "users_per_instance": 50,
      "compute_tier": "lambda_shared"
    },
    "limits": {
      "max_database_connections": 10,
      "max_file_size_mb": 50,
      "request_timeout_seconds": 60
    }
  }
}
```

### Instance Schema

```json
{
  "type": "instance",
  "name": "Customer's Instance",
  "description": "Instance description",
  "active": true,
  "metadata": {
    "user_id": "user_123",
    "subdomain": "acme",
    "status": "running",
    "plan_id": "plan_123",
    "quotas": { /* inherited from plan */ },
    "resources": {
      "database_endpoint": "shared-rds.us-east-1.rds.amazonaws.com",
      "database_name": "instance_abc123",
      "database_user": "user_abc123",
      "b2_bucket_name": "solobase-abc123",
      "lambda_arn": "arn:aws:lambda:us-east-1:xxx:function:solobase-abc123",
      "lambda_url": "https://xxx.lambda-url.us-east-1.on.aws",
      "cloudfront_id": "E123456789",
      "cloudfront_domain": "d123456.cloudfront.net",
      "url": "https://acme.solobase.cloud"
    },
    "provisioned_at": "2024-01-15T10:30:00Z",
    "last_health_check": "2024-01-15T14:30:00Z",
    "health_status": "healthy"
  }
}
```

## Instance Status Values

| Status | Description | Next Action |
|--------|-------------|-------------|
| `provisioning` | Infrastructure is being created | Wait for provisioner |
| `running` | Instance is healthy and accessible | None |
| `error` | Provisioning or runtime error occurred | Check logs, retry |
| `suspended` | Instance suspended (payment failed) | Resume after payment |
| `terminated` | Instance permanently deleted | None |

## API Endpoints (Products Extension)

### List Products

```bash
GET /api/products?type=subscription_plan
GET /api/products?type=instance&user_id=user_123
```

### Get Product

```bash
GET /api/products/{product_id}
```

### Create Checkout Session

```bash
POST /api/products/checkout
{
  "plan_id": "plan_123",
  "metadata": {
    "subdomain": "acme"
  }
}
```

Response:
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_xxx",
  "session_id": "cs_test_xxx"
}
```

### Update Product (Admin/Extension Only)

```bash
PUT /api/products/{product_id}
{
  "metadata": {
    "status": "running",
    "resources": { ... }
  }
}
```

## Quotas and Usage

Quotas are defined in the subscription plan and inherited by instances:

| Quota | Hobby | Starter | Professional | Business |
|-------|-------|---------|--------------|----------|
| Instances | 1 | 3 | 10 | Unlimited |
| Database Storage | 500MB | 2GB | 10GB | 50GB |
| File Storage | 2GB | 10GB | 100GB | 1TB |
| Bandwidth | 10GB | 50GB | 500GB | 5TB |
| API Requests/Day | 10K | 50K | 500K | Unlimited |
| Users | 10 | 50 | 500 | Unlimited |

**Note**: `-1` in quotas means unlimited.

## Loading Products into Solobase

### Option 1: API (Recommended)

```bash
# Load subscription plans
curl -X POST https://manage.solobase.cloud/api/products/bulk \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @subscription-plans.json
```

### Option 2: Database Import

```bash
# Connect to management database
psql -h $DATABASE_HOST -U $DATABASE_USER -d solobase_management

# Import products
\copy products(type, name, description, price, currency, interval, active, metadata)
FROM 'subscription-plans.json' WITH (FORMAT csv);
```

### Option 3: Admin Dashboard

1. Log in to https://manage.solobase.cloud
2. Navigate to Products → Create Product
3. Select type: `subscription_plan`
4. Fill in the form with plan details
5. Save

## Stripe Integration

### Setting Up Stripe Products

Before loading products into Solobase, create corresponding products in Stripe:

```bash
# Create Hobby plan in Stripe
stripe products create --name="Hobby" --description="Personal projects"
stripe prices create --product=prod_xxx --unit-amount=500 --currency=usd --recurring[interval]=month

# Update subscription-plans.json with Stripe price ID
# metadata.stripe_price_id = "price_xxx"
```

Or use Stripe Dashboard:
1. Products → Create Product
2. Set price to $5/month
3. Copy Price ID
4. Update `subscription-plans.json`

### Webhook Configuration

Ensure Stripe webhook is configured:

```bash
stripe listen --forward-to https://manage.solobase.cloud/api/webhooks/stripe
```

Or in Stripe Dashboard:
1. Developers → Webhooks → Add endpoint
2. URL: `https://manage.solobase.cloud/api/webhooks/stripe`
3. Events: Select all `checkout.*`, `customer.subscription.*`, `invoice.*`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` env var

## Environment Variables

Required for products extension and instance provisioner:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Backblaze B2
B2_KEY_ID=xxx
B2_APP_KEY=xxx

# Shared RDS
SHARED_RDS_ENDPOINT=shared-rds.us-east-1.rds.amazonaws.com
SHARED_RDS_MASTER_USER=postgres
SHARED_RDS_MASTER_PASS=xxx

# CloudFront (for signed URLs)
CLOUDFRONT_KEY_PAIR_ID=xxx
CLOUDFRONT_PRIVATE_KEY=xxx
```

## Testing

### Test Plan Creation

```bash
curl -X POST http://localhost:8090/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription_plan",
    "name": "Test Plan",
    "price": 5.00,
    "interval": "month",
    "metadata": {
      "quotas": {
        "instances": 1,
        "database_storage_mb": 500
      }
    }
  }'
```

### Test Checkout Flow

```bash
curl -X POST http://localhost:8090/api/products/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "prod_123",
    "metadata": {
      "subdomain": "test-instance"
    }
  }'
```

### Test Instance Creation (Manual)

```bash
curl -X POST http://localhost:8090/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "instance",
    "name": "Test Instance",
    "metadata": {
      "user_id": "user_123",
      "subdomain": "test",
      "status": "provisioning",
      "plan_id": "plan_123",
      "quotas": {
        "database_storage_mb": 500,
        "file_storage_gb": 2
      }
    }
  }'
```

## Monitoring

Monitor instance health and subscription status:

```bash
# Check instance health
GET /api/products/{instance_id}/health

# List unhealthy instances
GET /api/products?type=instance&health_status=unhealthy

# Check subscription status
GET /api/products?type=subscription&user_id={user_id}
```

## Troubleshooting

### Instance stuck in "provisioning"

1. Check instance provisioner extension logs
2. Verify AWS credentials and permissions
3. Check RDS connectivity
4. Manually update status if needed:
   ```bash
   PUT /api/products/{instance_id}
   {"metadata": {"status": "error", "error": "Manual intervention required"}}
   ```

### Stripe webhook not working

1. Verify webhook secret matches Stripe
2. Check webhook endpoint is publicly accessible
3. View webhook logs in Stripe dashboard
4. Test with Stripe CLI: `stripe trigger checkout.session.completed`

### Customer can't access instance

1. Check instance status is "running"
2. Verify CloudFront distribution is deployed
3. Check DNS configuration for subdomain
4. Test Lambda function URL directly
5. Check instance health endpoint

## Next Steps

1. ✅ Load subscription plans into products extension
2. ✅ Configure Stripe products and webhooks
3. ✅ Test checkout flow end-to-end
4. ✅ Deploy instance provisioner extension
5. ✅ Monitor first customer instance provisioning

# Solobase Scripts

Utility scripts for managing the Solobase SaaS platform.

## Scripts

### load-plans.sh

Loads subscription plans into the products extension.

**Usage:**

```bash
# With environment variable
export ADMIN_TOKEN="your-token"
./scripts/load-plans.sh

# Interactive (will prompt for credentials)
./scripts/load-plans.sh

# Custom API URL
API_URL=https://manage.solobase.cloud/api ./scripts/load-plans.sh
```

**What it does:**

1. Authenticates with admin credentials (if token not provided)
2. Checks for existing plans
3. Optionally deletes existing plans
4. Loads plans from `products/subscription-plans.json`
5. Verifies all plans were created successfully

**Environment Variables:**

- `API_URL` - Solobase API endpoint (default: `http://localhost:8090/api`)
- `ADMIN_TOKEN` - Admin JWT token (optional, will prompt if not set)
- `PLANS_FILE` - Path to plans JSON file (default: `products/subscription-plans.json`)

---

### test-flow.sh

Tests the complete instance provisioning flow.

**Usage:**

```bash
# Test with local API
./scripts/test-flow.sh

# Test with production API
API_URL=https://manage.solobase.cloud/api ./scripts/test-flow.sh
```

**What it does:**

1. Logs in as admin
2. Fetches subscription plans
3. Creates a test instance
4. Monitors provisioning status (polls every 5 seconds for 2 minutes)
5. Displays instance details when provisioning completes

**Output:**

```
Solobase Flow Test
==================

Step 1: Logging in as admin...
✓ Login successful

Step 2: Fetching subscription plans...
✓ Found 4 plan(s)
  - Hobby: $5/mo
  - Starter: $15/mo
  - Professional: $79/mo
  - Business: $199/mo

Using plan: prod_hobby (Hobby)

Step 3: Creating test instance (subdomain: test-1642252200)...
✓ Instance created: inst_abc123

Step 4: Monitoring provisioning (checking every 5 seconds)...

  [14:30:05] Status: provisioning (provisioning...)
  [14:30:10] Status: provisioning (provisioning...)
  [14:30:15] Status: running ✓

==================
Instance provisioned successfully!

Instance Details:
  ID: inst_abc123
  Subdomain: test-1642252200
  URL: https://test-1642252200.solobase.cloud
  Database: instance_abc123
  Lambda: arn:aws:lambda:us-east-1:xxx:function:solobase-abc123
```

**Environment Variables:**

- `API_URL` - Solobase API endpoint (default: `http://localhost:8090/api`)

---

## Prerequisites

All scripts require:

- `curl` - HTTP client
- `jq` - JSON processor

Install on macOS:
```bash
brew install jq
```

Install on Ubuntu/Debian:
```bash
sudo apt install -y jq curl
```

---

## Common Workflows

### Initial Setup

```bash
# 1. Load subscription plans
./scripts/load-plans.sh

# 2. Test instance provisioning
./scripts/test-flow.sh
```

### Update Plans

```bash
# 1. Edit plans
vim products/subscription-plans.json

# 2. Reload plans
./scripts/load-plans.sh
# Answer 'y' to delete existing plans
```

### Verify Production Deployment

```bash
# Test production API
API_URL=https://manage.solobase.cloud/api ./scripts/test-flow.sh
```

---

## Troubleshooting

### Error: "jq: command not found"

Install jq:
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install -y jq
```

### Error: "Login failed"

Check your credentials in `.env`:
```bash
cat .env | grep ADMIN_
```

Verify Solobase is running:
```bash
curl http://localhost:8090/health
```

### Error: "No plans found"

Run `load-plans.sh` first:
```bash
./scripts/load-plans.sh
```

### Error: "Connection refused"

Ensure Solobase is running:
```bash
# Check if running
ps aux | grep solobase

# Start Solobase
cd solobase
./solobase start --config=config.yml

# Or with systemd
sudo systemctl status solobase
```

---

## Development Tips

### Get Admin Token Manually

```bash
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@solobase.cloud",
    "password": "change-this-in-production"
  }' | jq -r '.data.token'
```

### Query All Products

```bash
export TOKEN="your-token"

# All products
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/products | jq '.'

# Subscription plans only
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/products?type=subscription_plan | jq '.'

# Instances only
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/products?type=instance | jq '.'
```

### Delete All Products

```bash
export TOKEN="your-token"

# Get all product IDs
PRODUCT_IDS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/products | jq -r '.data[].id')

# Delete each product
for ID in $PRODUCT_IDS; do
  echo "Deleting $ID..."
  curl -X DELETE -H "Authorization: Bearer $TOKEN" \
    http://localhost:8090/api/products/$ID
done
```

### Watch Logs in Real-Time

```bash
# Application logs
tail -f logs/solobase.log

# Filter for provisioning events
tail -f logs/solobase.log | grep "Instance Provisioner"

# Filter for specific instance
tail -f logs/solobase.log | grep "inst_abc123"
```

---

## API Endpoints Reference

### Authentication

```bash
# Login
POST /api/auth/login
Body: {"email": "...", "password": "..."}

# Get current user
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

### Products

```bash
# List products
GET /api/products?type={type}
Headers: Authorization: Bearer {token}

# Get product
GET /api/products/{id}
Headers: Authorization: Bearer {token}

# Create product
POST /api/products
Headers: Authorization: Bearer {token}
Body: {product object}

# Update product
PUT /api/products/{id}
Headers: Authorization: Bearer {token}
Body: {updates}

# Delete product
DELETE /api/products/{id}
Headers: Authorization: Bearer {token}
```

### Checkout

```bash
# Create Stripe checkout session
POST /api/products/checkout
Headers: Authorization: Bearer {token}
Body: {
  "plan_id": "prod_xxx",
  "metadata": {
    "subdomain": "my-instance"
  }
}
```

---

## Contributing

To add a new script:

1. Create script in `scripts/` directory
2. Make it executable: `chmod +x scripts/your-script.sh`
3. Add usage documentation to this README
4. Test with both local and production environments

---

## License

MIT

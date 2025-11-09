#!/bin/bash
# Test the complete instance provisioning flow

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:8090/api}"

echo -e "${GREEN}Solobase Flow Test${NC}"
echo "=================="
echo ""

# Step 1: Login
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@solobase.cloud",
        "password": "change-this-in-production"
    }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Step 2: Get subscription plans
echo "Step 2: Fetching subscription plans..."
PLANS_RESPONSE=$(curl -s -X GET "$API_URL/products?type=subscription_plan" \
    -H "Authorization: Bearer $TOKEN")

PLAN_COUNT=$(echo "$PLANS_RESPONSE" | jq '.data | length')

if [ "$PLAN_COUNT" -eq 0 ]; then
    echo -e "${RED}✗ No plans found. Run scripts/load-plans.sh first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found $PLAN_COUNT plan(s)${NC}"
echo "$PLANS_RESPONSE" | jq -r '.data[] | "  - \(.name): $\(.price)/mo"'
echo ""

# Step 3: Get first plan ID
HOBBY_PLAN_ID=$(echo "$PLANS_RESPONSE" | jq -r '.data[0].id')
echo "Using plan: $HOBBY_PLAN_ID (Hobby)"
echo ""

# Step 4: Create test instance
SUBDOMAIN="test-$(date +%s)"
echo "Step 3: Creating test instance (subdomain: $SUBDOMAIN)..."

INSTANCE_RESPONSE=$(curl -s -X POST "$API_URL/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"instance\",
        \"name\": \"Test Instance\",
        \"metadata\": {
            \"user_id\": \"user_test\",
            \"subdomain\": \"$SUBDOMAIN\",
            \"status\": \"provisioning\",
            \"plan_id\": \"$HOBBY_PLAN_ID\",
            \"admin_email\": \"admin@test.com\",
            \"admin_password\": \"testpass123\",
            \"quotas\": {
                \"database_storage_mb\": 500,
                \"file_storage_gb\": 2,
                \"compute_tier\": \"lambda_shared\"
            }
        }
    }")

INSTANCE_ID=$(echo "$INSTANCE_RESPONSE" | jq -r '.data.id')
SUCCESS=$(echo "$INSTANCE_RESPONSE" | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
    echo -e "${RED}✗ Instance creation failed${NC}"
    echo "$INSTANCE_RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Instance created: $INSTANCE_ID${NC}"
echo ""

# Step 5: Monitor provisioning
echo "Step 4: Monitoring provisioning (checking every 5 seconds)..."
echo ""

MAX_ATTEMPTS=24  # 2 minutes max
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 5
    ATTEMPT=$((ATTEMPT + 1))

    INSTANCE=$(curl -s -X GET "$API_URL/products/$INSTANCE_ID" \
        -H "Authorization: Bearer $TOKEN")

    STATUS=$(echo "$INSTANCE" | jq -r '.data.metadata.status')

    echo -n "  [$(date +%H:%M:%S)] Status: $STATUS"

    if [ "$STATUS" == "running" ]; then
        echo -e " ${GREEN}✓${NC}"
        echo ""

        # Get instance details
        INSTANCE_URL=$(echo "$INSTANCE" | jq -r '.data.metadata.resources.url')
        DB_NAME=$(echo "$INSTANCE" | jq -r '.data.metadata.resources.database_name')
        LAMBDA_ARN=$(echo "$INSTANCE" | jq -r '.data.metadata.resources.lambda_arn')

        echo "=================="
        echo -e "${GREEN}Instance provisioned successfully!${NC}"
        echo ""
        echo "Instance Details:"
        echo "  ID: $INSTANCE_ID"
        echo "  Subdomain: $SUBDOMAIN"
        echo "  URL: $INSTANCE_URL"
        echo "  Database: $DB_NAME"
        echo "  Lambda: $LAMBDA_ARN"
        echo ""

        # Display full instance object
        echo "Full Instance Object:"
        echo "$INSTANCE" | jq '.data'

        exit 0
    elif [ "$STATUS" == "error" ]; then
        echo -e " ${RED}✗${NC}"
        echo ""
        ERROR=$(echo "$INSTANCE" | jq -r '.data.metadata.error')
        echo -e "${RED}Provisioning failed: $ERROR${NC}"
        echo ""
        echo "$INSTANCE" | jq '.data'
        exit 1
    else
        echo " (provisioning...)"
    fi
done

echo ""
echo -e "${YELLOW}Provisioning timeout after 2 minutes${NC}"
echo "Check logs for more details:"
echo "  tail -f logs/solobase.log | grep '$INSTANCE_ID'"

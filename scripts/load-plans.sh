#!/bin/bash
# Load subscription plans into Solobase products extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8090/api}"
PLANS_FILE="${PLANS_FILE:-products/subscription-plans.json}"

echo -e "${GREEN}Solobase Plans Loader${NC}"
echo "=================="
echo ""

# Check if plans file exists
if [ ! -f "$PLANS_FILE" ]; then
    echo -e "${RED}Error: Plans file not found: $PLANS_FILE${NC}"
    exit 1
fi

# Get admin token
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}Admin token not found in environment.${NC}"
    echo -n "Please enter admin email: "
    read ADMIN_EMAIL
    echo -n "Please enter admin password: "
    read -s ADMIN_PASSWORD
    echo ""

    # Login to get token
    echo "Logging in..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

    if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}Login failed. Please check your credentials.${NC}"
        echo "$LOGIN_RESPONSE" | jq '.'
        exit 1
    fi

    echo -e "${GREEN}Login successful!${NC}"
    echo ""
fi

# Check if plans already exist
echo "Checking existing plans..."
EXISTING_PLANS=$(curl -s -X GET "$API_URL/products?type=subscription_plan" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

PLAN_COUNT=$(echo "$EXISTING_PLANS" | jq '.data | length')

if [ "$PLAN_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}Found $PLAN_COUNT existing plan(s).${NC}"
    echo -n "Do you want to delete existing plans and reload? (y/N): "
    read CONFIRM

    if [ "$CONFIRM" == "y" ] || [ "$CONFIRM" == "Y" ]; then
        echo "Deleting existing plans..."
        PLAN_IDS=$(echo "$EXISTING_PLANS" | jq -r '.data[].id')

        for PLAN_ID in $PLAN_IDS; do
            echo "  Deleting plan: $PLAN_ID"
            curl -s -X DELETE "$API_URL/products/$PLAN_ID" \
                -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
        done

        echo -e "${GREEN}Existing plans deleted.${NC}"
    else
        echo "Keeping existing plans. Exiting."
        exit 0
    fi
fi

# Load plans
echo ""
echo "Loading subscription plans from $PLANS_FILE..."
echo ""

# Read and parse JSON file
PLANS=$(cat "$PLANS_FILE")
PLAN_NAMES=$(echo "$PLANS" | jq -r '.[].name')

# Create each plan
INDEX=0
for PLAN_NAME in $PLAN_NAMES; do
    PLAN_DATA=$(echo "$PLANS" | jq ".[$INDEX]")

    echo -n "Creating plan: $PLAN_NAME... "

    RESPONSE=$(curl -s -X POST "$API_URL/products" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PLAN_DATA")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

    if [ "$SUCCESS" == "true" ]; then
        PLAN_ID=$(echo "$RESPONSE" | jq -r '.data.id')
        PLAN_PRICE=$(echo "$RESPONSE" | jq -r '.data.price')
        echo -e "${GREEN}✓ Created (ID: $PLAN_ID, Price: \$$PLAN_PRICE/mo)${NC}"
    else
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
        echo -e "${RED}✗ Failed: $ERROR_MSG${NC}"
    fi

    INDEX=$((INDEX + 1))
done

# Verify plans loaded
echo ""
echo "Verifying plans..."
LOADED_PLANS=$(curl -s -X GET "$API_URL/products?type=subscription_plan" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

LOADED_COUNT=$(echo "$LOADED_PLANS" | jq '.data | length')

echo ""
echo "=================="
echo -e "${GREEN}Successfully loaded $LOADED_COUNT subscription plan(s)!${NC}"
echo ""

# Display loaded plans
echo "Loaded Plans:"
echo "$LOADED_PLANS" | jq -r '.data[] | "  - \(.name): $\(.price)/\(.interval) (ID: \(.id))"'

echo ""
echo "Next steps:"
echo "1. Update Stripe price IDs in products/subscription-plans.json"
echo "2. Test checkout flow: curl -X POST $API_URL/products/checkout"
echo "3. Configure Stripe webhook: $API_URL/api/webhooks/stripe"

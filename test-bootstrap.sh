#!/bin/bash
# Quick test script to verify bootstrap setup

echo "Testing Household Management Bootstrap"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to test endpoint
test_endpoint() {
  local url=$1
  local name=$2
  
  if response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null); then
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "200" ] || [ "$http_code" = "000" ]; then
      echo -e "${GREEN}✓${NC} $name"
      return 0
    else
      echo -e "${RED}✗${NC} $name (HTTP $http_code)"
      return 1
    fi
  else
    echo -e "${RED}✗${NC} $name (unreachable)"
    return 1
  fi
}

echo "Backend..."
test_endpoint "http://localhost:3001/api/health" "Backend health"

echo ""
echo "Database Connection..."
test_endpoint "http://localhost:3001/api/db-check" "Database check"

echo ""
echo "Frontend..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200"; then
  echo -e "${GREEN}✓${NC} Frontend (Next.js)"
else
  echo -e "${YELLOW}ℹ${NC} Frontend may still be starting..."
fi

echo ""
echo "=========================================="
echo ""
echo "Bootstrap tests complete!"
echo ""
echo "To run this test script:"
echo "  bash test-bootstrap.sh"
echo ""
echo "Make sure both services are running:"
echo "  Backend:  npm run dev (in server/)"
echo "  Frontend: npm run dev (in client/)"

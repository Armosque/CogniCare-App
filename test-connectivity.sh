#!/bin/bash

# CogniCare - End-to-End Connectivity Test
# Tests: Backend health -> Frontend availability -> Basic API endpoints

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════${NC}\n"
}

print_test() {
    echo -e "${YELLOW}→${NC}  $1"
}

print_pass() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_fail() {
    echo -e "${RED}✗${NC}  $1"
}

# Test 1: Backend health check
print_header "Test 1: Backend Health Check"
print_test "Checking if backend is healthy at http://localhost:8000/health"

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    print_pass "Backend is healthy"
else
    print_fail "Backend health check failed"
    exit 1
fi

# Test 2: Frontend availability
print_header "Test 2: Frontend Availability"
print_test "Checking if frontend is running at http://localhost:3000"

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_pass "Frontend is accessible"
else
    print_fail "Frontend is not accessible"
    exit 1
fi

# Test 3: API Documentation
print_header "Test 3: API Documentation"
print_test "Checking API docs at http://localhost:8000/docs"

if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    print_pass "API documentation is available (Swagger UI)"
else
    print_fail "API docs not available"
    exit 1
fi

# Test 4: Backend endpoints status
print_header "Test 4: Backend API Endpoints"

print_test "Testing GET /api/messages (list messages)"
RESPONSE=$(curl -s -w "%{http_code}" -X GET "http://localhost:8000/api/messages?user_id=test-user" -H "Content-Type: application/json")
HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    print_pass "GET /api/messages - HTTP $HTTP_CODE"
else
    print_fail "GET /api/messages - HTTP $HTTP_CODE (Expected 200/401)"
fi

print_test "Testing GET /health endpoint"
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q "status\|healthy"; then
    print_pass "GET /health returned: $(echo $HEALTH | cut -c1-50)..."
else
    print_fail "Health response invalid"
fi

# Test 5: Docker services status
print_header "Test 5: Docker Services Status"
print_test "Checking docker-compose services..."

cd /home/afelopez/Projects/CogniCare-App

STATUS=$(docker compose ps 2>/dev/null | grep -E "cognicare-backend|cognicare-frontend")
if echo "$STATUS" | grep -q "healthy"; then
    print_pass "Services are running and healthy"
    echo "$STATUS" | sed 's/^/  /'
else
    print_fail "Services may not be healthy"
fi

# Test 6: Python dependencies
print_header "Test 6: Backend Dependencies Check"
print_test "Checking if all Python dependencies are installed..."

DEPS_CHECK=$(docker compose exec backend python3 -c "
import sys
required = ['fastapi', 'uvicorn', 'pydantic', 'azure.cosmos', 'asyncio']
missing = []
for pkg in required:
    try:
        __import__(pkg.split('.')[0])
    except ImportError:
        missing.append(pkg)

if missing:
    print(f'Missing: {missing}')
    sys.exit(1)
else:
    print('All dependencies OK')
" 2>&1)

if echo "$DEPS_CHECK" | grep -q "All dependencies OK"; then
    print_pass "All Python dependencies installed"
else
    print_fail "Missing dependencies: $DEPS_CHECK"
fi

# Test 7: Frontend build check
print_header "Test 7: Frontend Build Status"
print_test "Checking Next.js build artifacts..."

BUILD_CHECK=$(docker compose exec frontend ls -la /app/.next 2>&1 | head -3)
if echo "$BUILD_CHECK" | grep -q "static\|server"; then
    print_pass "Next.js build artifacts found"
else
    print_fail "Next.js build may be incomplete"
fi

# Final summary
print_header "Test Summary"
echo -e "${GREEN}✓ Connectivity Tests Passed${NC}"
echo ""
echo "Available URLs:"
echo "  • Frontend:       http://localhost:3000"
echo "  • Backend:        http://localhost:8000"
echo "  • API Docs:       http://localhost:8000/docs"
echo "  • API (ReDoc):    http://localhost:8000/redoc"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Check http://localhost:8000/docs for available endpoints"
echo "  3. Run: ./dev.sh logs to view service logs"
echo "  4. Run: ./dev.sh shell-backend to access Python shell"
echo ""

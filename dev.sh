#!/bin/bash

# CogniCare Development Helper Script
# Usage: ./dev.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════${NC}\n"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

# Commands
cmd_start() {
    print_header "Starting Development Environment"
    print_info "Starting services with hot-reload enabled..."
    docker-compose up -d
    print_info "Waiting for services to be healthy..."
    sleep 5
    docker-compose ps
    print_success "Development environment started!"
    print_info "Frontend:  http://localhost:3000"
    print_info "Backend:   http://localhost:8000"
    print_info "API Docs:  http://localhost:8000/docs"
}

cmd_stop() {
    print_header "Stopping Development Environment"
    docker-compose down
    print_success "Development environment stopped"
}

cmd_restart() {
    print_header "Restarting Services"
    docker-compose restart
    print_success "Services restarted"
}

cmd_logs() {
    print_header "Showing Logs"
    local service=$1
    if [ -z "$service" ]; then
        docker-compose logs -f --tail=100
    else
        docker-compose logs -f "$service" --tail=100
    fi
}

cmd_status() {
    print_header "Service Status"
    docker-compose ps
}

cmd_backend_logs() {
    print_header "Backend Logs"
    docker-compose logs -f backend --tail=50
}

cmd_frontend_logs() {
    print_header "Frontend Logs"
    docker-compose logs -f frontend --tail=50
}

cmd_test() {
    print_header "Running Backend Tests"
    docker-compose exec backend pytest tests/ -v
}

cmd_test_unit() {
    print_header "Running Unit Tests"
    docker-compose exec backend pytest tests/unit/ -v
}

cmd_test_integration() {
    print_header "Running Integration Tests"
    docker-compose exec backend pytest tests/integration/ -v
}

cmd_build() {
    print_header "Building Docker Images"
    docker-compose build
    print_success "Build complete"
}

cmd_rebuild() {
    print_header "Rebuilding and Restarting"
    docker-compose down
    docker-compose build
    docker-compose up -d
    print_success "Rebuild complete and services restarted"
}

cmd_shell_backend() {
    print_header "Opening Backend Shell"
    docker-compose exec backend /bin/bash
}

cmd_shell_frontend() {
    print_header "Opening Frontend Shell"
    docker-compose exec frontend /bin/sh
}

cmd_db_status() {
    print_header "Database Connection Check"
    docker-compose exec backend python -c "
import requests
try:
    r = requests.get('http://localhost:8000/health', timeout=5)
    print(f'✓ Backend Health: {r.status_code}')
except Exception as e:
    print(f'✗ Backend Error: {e}')
"
}

cmd_clean() {
    print_header "Cleaning Up"
    print_info "Stopping containers..."
    docker-compose down
    print_info "Removing volumes..."
    docker volume prune -f --filter "label!=keep"
    print_success "Cleanup complete"
}

cmd_env_check() {
    print_header "Environment Check"
    if [ -f .env ]; then
        print_success ".env file exists"
        print_info "Configured variables:"
        grep -v '^#' .env | grep -v '^$' | sed 's/^/  /' || true
    else
        print_error ".env file not found"
        print_info "Copy .env.example to .env and configure it:"
        print_info "  cp .env.example .env"
    fi
}

cmd_help() {
    cat << EOF
${GREEN}CogniCare Development Helper${NC}

${BLUE}Usage:${NC}
  ./dev.sh [command] [options]

${BLUE}Commands:${NC}
  start              Start development environment with hot-reload
  stop               Stop all services
  restart            Restart services
  status             Show service status
  
  logs [service]     Show logs (all, backend, or frontend)
  backend-logs       Show backend logs only
  frontend-logs      Show frontend logs only
  
  test               Run all backend tests
  test-unit          Run unit tests only
  test-integration   Run integration tests only
  
  build              Build Docker images
  rebuild            Clean rebuild and restart
  
  shell-backend      Open backend shell
  shell-frontend     Open frontend shell
  
  db-status          Check database connection
  env-check          Check environment configuration
  clean              Stop containers and clean volumes
  
  help               Show this help message

${BLUE}Examples:${NC}
  ./dev.sh start
  ./dev.sh logs backend
  ./dev.sh test
  ./dev.sh rebuild

${BLUE}Documentation:${NC}
  See DEVELOPMENT.md for detailed development guide

EOF
}

# Main
main() {
    local cmd=${1:-help}
    
    case "$cmd" in
        start)
            cmd_start
            ;;
        stop)
            cmd_stop
            ;;
        restart)
            cmd_restart
            ;;
        status)
            cmd_status
            ;;
        logs)
            cmd_logs "$2"
            ;;
        backend-logs|backend_logs)
            cmd_backend_logs
            ;;
        frontend-logs|frontend_logs)
            cmd_frontend_logs
            ;;
        test)
            cmd_test
            ;;
        test-unit|test_unit)
            cmd_test_unit
            ;;
        test-integration|test_integration)
            cmd_test_integration
            ;;
        build)
            cmd_build
            ;;
        rebuild)
            cmd_rebuild
            ;;
        shell-backend|shell_backend)
            cmd_shell_backend
            ;;
        shell-frontend|shell_frontend)
            cmd_shell_frontend
            ;;
        db-status|db_status)
            cmd_db_status
            ;;
        clean)
            cmd_clean
            ;;
        env-check|env_check)
            cmd_env_check
            ;;
        help)
            cmd_help
            ;;
        *)
            print_error "Unknown command: $cmd"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

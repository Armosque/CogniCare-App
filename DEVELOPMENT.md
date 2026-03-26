# 🚀 CogniCare - Development Guide

## Quick Start with Hot-Reload

### Prerequisites
- Docker & Docker Compose installed
- Azure Cosmos DB credentials (.env file configured)

### Proyecto Structure
```
.
├── backend/          # FastAPI Python backend
├── frontend/         # Next.js React frontend
├── docker-compose.yml # Development setup (with hot-reload)
└── .env             # Environment variables
```

## Development Setup

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and add your Azure credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `AZURE_COSMOS_ENDPOINT`
- `AZURE_COSMOS_KEY`
- `AZURE_COSMOS_DATABASE_ID`

### 2. Start Services with Hot-Reload

```bash
docker-compose up -d
```

This will:
- **Backend** (port 8000):
  - Start FastAPI with Uvicorn reload mode
  - Watch `/backend` directory for changes
  - Auto-restart on Python file changes ✅
  
- **Frontend** (port 3000):
  - Start Next.js in development mode
  - Watch `/frontend/src` for changes
  - Hot Module Replacement (HMR) enabled ✅

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Follow new logs only
docker-compose logs -f --tail=100
```

### 4. Make Changes (No Restart Needed!)

#### Backend Changes:
```python
# Edit backend/app/service/message_service.py
# Changes are automatically picked up by Uvicorn --reload
```

#### Frontend Changes:
```typescript
// Edit frontend/src/app/page.tsx
// Changes are automatically picked up by Next.js dev server
```

## Stopping Services

```bash
# Stop all services (keep volumes)
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend
```

## Common Issues

### Port Already in Use
```bash
# Find what's using port 3000 or 8000
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Volume Not Syncing
```bash
# Restart with fresh volumes
docker-compose down -v
docker-compose up -d
```

### Health Checks Failing
```bash
# Check health status
docker-compose ps

# If unhealthy, check logs
docker-compose logs backend
docker-compose logs frontend
```

### Module Not Found (Frontend)
```bash
# node_modules volume is excluded, use named volume
# If npm packages changed, rebuild:
docker-compose build frontend
docker-compose up -d frontend
```

## Development Workflow

### Adding Backend Dependencies

1. Edit `backend/requirements.txt`
2. Rebuild container:
   ```bash
   docker-compose build backend
   docker-compose up -d backend
   ```

### Adding Frontend Dependencies

1. Edit `frontend/package.json`
2. Rebuild container:
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Testing

```bash
# Backend tests
docker-compose exec backend pytest tests/

# Run specific test
docker-compose exec backend pytest tests/unit/test_message_service.py -v

# Frontend tests
docker-compose exec frontend npm test
```

## API Documentation

Once running, visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

## Database

### Connect to Cosmos DB

The backend connects automatically using credentials from `.env`:
- Database: `cognicare` (or `AZURE_COSMOS_DATABASE_ID`)
- Containers: `messages`, `preferences`, `users`

### View Database

```bash
# Through Azure Portal: https://portal.azure.com
# Data Explorer tab in your Cosmos DB account
```

## Environment Modes

### Development (Current)
```bash
BACKEND_DEBUG=true
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://backend:8000
```

### Production-like Testing
```bash
# Edit .env
BACKEND_DEBUG=false
NODE_ENV=production

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## Performance Tips

1. **Backend reload is slow** - Consider disabling for large projects:
   ```yaml
   command: uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Frontend HMR issues** - Add to `.env`:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=dev-secret-change-in-prod
   ```

3. **Memory Issues** - Increase Docker memory:
   ```bash
   docker-compose up --memory=4g -d
   ```

## Resources

- [FastAPI + Uvicorn](https://fastapi.tiangolo.com/deployment/manually/)
- [Next.js Development](https://nextjs.org/docs/getting-started/installation)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Azure Cosmos DB Python SDK](https://learn.microsoft.com/en-us/python/api/azure-cosmos/)

---

**Happy coding!** 🎉

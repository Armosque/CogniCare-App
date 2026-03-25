# 🚀 Mejoras Iniciales - CogniCare Refactoring

## 🎯 Objetivo General

Transformar CogniCare de una arquitectura monolítica Next.js a una arquitectura **desacoplada con backend FastAPI seguro y escalable**, usando Docker Compose con best practices.

---

## 📋 Lista de Mejoras Iniciales

### FASE 1: Arquitectura Base y Desacoplamiento

#### 1.1 Crear Backend FastAPI
- [ ] Inicializar proyecto FastAPI con estructura modular
- [ ] Configurar carpeta `/backend` en la raíz del proyecto
- [ ] Estructura:
```
backend/
├── app/
│   ├── main.py                 # Entrada principal
│   ├── config.py               # Configuración (env vars)
│   ├── dependencies.py         # Dependencias compartidas
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── auth.py        # Rutas de autenticación
│   │   │   ├── messages.py    # Rutas de mensajes/chat
│   │   │   ├── preferences.py # Rutas de preferencias
│   │   │   └── health.py      # Health checks
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth.py        # JWT validation
│   │       └── cors.py        # CORS handling
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py      # Orquestación con Azure AI
│   │   ├── message_service.py # Lógica de mensajes
│   │   ├── user_service.py    # Lógica de usuarios
│   │   └── file_service.py    # Parseo de documentos
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base.py            # Repositorio base
│   │   ├── message_repo.py    # Operaciones de mensajes
│   │   ├── user_repo.py       # Operaciones de usuarios
│   │   └── preference_repo.py # Operaciones de preferencias
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py         # Pydantic models
│   │   ├── database.py        # ORM models
│   │   └── enums.py           # Enumeraciones
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py          # Logging
│   │   ├── exceptions.py      # Custom exceptions
│   │   └── validators.py      # Validadores
│   └── db/
│       ├── __init__.py
│       ├── database.py        # Conexión a DB
│       ├── session.py         # Session management
│       └── migrations/        # Alembic migrations
├── requirements.txt
├── Dockerfile
└── pyproject.toml (Poetry)
```

#### 1.2 Separar Lógica Frontend
- [ ] Convertir `page.tsx` a consumir API en lugar de server actions
- [ ] Crear carpeta `/src/services/api-client.ts`
- [ ] Implementar cliente HTTP con `axios` o `fetch`
- [ ] Rutas de API:
  - `POST /api/messages` - Enviar mensaje
  - `GET /api/messages` - Obtener historial
  - `DELETE /api/messages/{id}` - Eliminar mensaje
  - `GET /api/preferences` - Obtener preferencias
  - `PUT /api/preferences` - Actualizar preferencias
  - `POST /api/files/extract` - Parsear archivos
  - `POST /api/health` - Health check

#### 1.3 Autenticación Desacoplada
- [ ] Implementar JWT en FastAPI (PyJWT, python-jose)
- [ ] Mantener NextAuth en frontend para SSO con Azure AD
- [ ] Backend obtiene token JWT de NextAuth
- [ ] Validar JWT en cada request al backend
- [ ] Estructura:
  ```
  Frontend (NextAuth) → Token JWT → Backend (Valida)
  ```

---

### FASE 2: Base de Datos y Persistencia

#### 2.1 Emular Cosmos DB Localmente
- [ ] Usar **Azure Cosmos DB Emulator** OR **MongoDB** (compatible con Cosmos API)
- [ ] Alternativa ligera: **Couchbase** Community Edition
- [ ] Configurar contenedor Docker

**Opción 1: Azure Cosmos Emulator (Recomendado)**
- [ ] Descargar imagen: `mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator`
- [ ] Ejecutar en Docker Compose
- [ ] Conectar con `aiocosmicdb` (async driver)

**Opción 2: MongoDB (Alternativa)**
- [ ] MongoDB 7.0+ con Atlas emulador local
- [ ] Usar `motor` para async operations
- [ ] Compatible con cambios mínimos en la lógica

#### 2.2 ORM Selectivo
- [ ] Si usas Cosmos: **aiocosmicdb** (async)
- [ ] Si usas MongoDB: **Motor** + **Beanie** (async ODM)
- [ ] NO usar SQLAlchemy si es NoSQL (complejidad innecesaria)
- [ ] Implementar patrón Repository para abstracción

#### 2.3 Migraciones
- [ ] Para NoSQL: Manual scripts en `/db/migrations/`
- [ ] Versionado de schema con archivos JSON
- [ ] Script de inicialización de contenedores

---

### FASE 3: Asincronismo y Escalabilidad

#### 3.1 Async/Await en FastAPI
- [ ] Todas las rutas como `async def`
- [ ] Usar `asyncio` para operaciones paralelas
- [ ] Connection pooling para DB
- [ ] Ejemplo:
```python
@router.post("/messages")
async def send_message(msg: MessageSchema):
    # Parallelizar operaciones
    user_data, ai_response = await asyncio.gather(
        user_repo.get_user(user_id),
        ai_service.process_message(msg.content)
    )
    return await message_repo.create(user_data, ai_response)
```

#### 3.2 Task Queue para Procesamiento de IA
- [ ] Usar **Celery** + **Redis** para jobs async largo
- [ ] Alternativa: **APScheduler** para tareas programadas
- [ ] Flujo:
  ```
  Cliente → Backend → Celery Task → IA Service → Callback
  ```

#### 3.3 Caching
- [ ] Redis para cache de respuestas frecuentes
- [ ] TTL configurable por preferencias de usuario
- [ ] Invalidación inteligente de cache

#### 3.4 Rate Limiting
- [ ] `slowapi` para rate limiting por usuario
- [ ] Protección contra abuse de Azure AI API

---

### FASE 4: Seguridad

#### 4.1 Variables de Entorno
- [ ] Nunca hardcodear credenciales
- [ ] Usar `python-dotenv` en desarrollo
- [ ] En producción: Azure Key Vault
- [ ] Estructura `.env`:
```bash
# Backend
BACKEND_DEBUG=false
BACKEND_PORT=8000
DATABASE_URL=<cosmos-or-mongo-connection>

# NextAuth
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=http://localhost:3000

# Azure AD
AZURE_AD_CLIENT_ID=<id>
AZURE_AD_CLIENT_SECRET=<secret>
AZURE_AD_TENANT_ID=<tenant>

# Azure AI
AZURE_AI_KEY=<key>
AZURE_AI_ENDPOINT=<endpoint>

# Redis (para cache/queue)
REDIS_URL=redis://redis:6379

# CORS
FRONTEND_URL=http://localhost:3000
```

#### 4.2 JWT y Tokens
- [ ] Implementar refresh tokens
- [ ] Access tokens: 15 min
- [ ] Refresh tokens: 7 días
- [ ] Almacenar refresh tokens en DB (revocable)
- [ ] Endpoint de logout que invalida token

#### 4.3 Validación de Input
- [ ] Pydantic schemas para todas las requests
- [ ] Sanitización de strings
- [ ] Validación de tipos
- [ ] Tamaño máximo de uploads

#### 4.4 CORS y Headers de Seguridad
- [ ] Implementar CORS middleware específico
- [ ] Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- [ ] HTTPS only en producción
- [ ] CSRF protection

#### 4.5 Logging y Auditoría
- [ ] Usar `loguru` para logging estructurado
- [ ] Log todas las acciones de usuarios
- [ ] Enmascarar datos sensibles en logs
- [ ] Centralized logging (opcional: Azure Monitor/Application Insights)

#### 4.6 Manejo de Contraseñas y Secretos
- [ ] Si hay autenticación por password: `argon2-cffi`
- [ ] Nunca guardar plain text
- [ ] API keys en Azure Key Vault

---

### FASE 5: Docker y Docker Compose

#### 5.1 Dockerizar Backend
- [ ] `Dockerfile` multi-stage:
```dockerfile
# Stage 1: Builder
FROM python:3.12-slim as builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY ./app ./app
ENV PATH=/root/.local/bin:$PATH

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 5.2 Docker Compose Full Stack
- [ ] Servicios:
  - `frontend` - Next.js en puerto 3000
  - `backend` - FastAPI en puerto 8000
  - `db` - Cosmos Emulator o MongoDB
  - `redis` - Para cache/queue (puerto 6379)
  - `nginx` - Reverse proxy (puerto 80/443)

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=cosmosdb+mongodb://<cosmos-emulator>:10255
      - REDIS_URL=redis://redis:6379
      - AZURE_AI_KEY=${AZURE_AI_KEY}
      - AZURE_AI_ENDPOINT=${AZURE_AI_ENDPOINT}
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app  # Hot reload en development

  db:
    image: mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
    ports:
      - "8081:8081"
      - "10255:10255"
    environment:
      - AZURE_COSMOS_EMULATOR_PARTITION_COUNT=4
    ssl: false

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend
```

#### 5.3 Dockerfile para Next.js (Frontend)
- [ ] Multi-stage para optimizar tamaño
- [ ] Usar `node:20-alpine` para desarrollo

---

### FASE 6: Testing y Calidad

#### 6.1 Backend Testing
- [ ] Framework: **pytest** + **pytest-asyncio**
- [ ] Estructura:
```
backend/tests/
├── unit/
│   ├── test_services/
│   ├── test_repositories/
│   └── test_utils/
├── integration/
│   ├── test_api_routes/
│   └── test_db_operations/
└── conftest.py  # Fixtures compartidas
```
- [ ] Cobertura mínima: 80%
- [ ] Fixtures para mock de Azure AI y Cosmos

#### 6.2 Frontend Testing
- [ ] Mantener actual: Jest + React Testing Library
- [ ] Tests para nuevas rutas API

#### 6.3 Linting y Formato
- [ ] Backend: `black`, `isort`, `flake8`, `mypy`
- [ ] Frontend: ESLint, Prettier
- [ ] Pre-commit hooks

---

### FASE 7: Monitoreo y Observabilidad

#### 7.1 Logging Centralizado
- [ ] Backend: `loguru`
- [ ] Enviar a Azure Monitor/Application Insights

#### 7.2 Health Checks
- [ ] Endpoint `/health` de FastAPI
- [ ] Verificar: DB, Redis, Azure AI connection
- [ ] Readiness probe para Kubernetes (futuro)

#### 7.3 Métricas
- [ ] Prometheus metrics (opcional)
- [ ] Contar requests, latencia, errores
- [ ] Dashboard con Grafana (futuro)

---

### FASE 8: CI/CD

#### 8.1 GitHub Actions
- [ ] Trigger: Push a main/develop
- [ ] Jobs:
  - Lint backend
  - Run backend tests
  - Build Docker images
  - Push a registry (opcional)

#### 8.2 Pre-deployment Checks
- [ ] Verificar .env.local no está committeado
- [ ] Validar Dockerfiles
- [ ] Security scanning con `trivy`

---

## 📊 Estructura del Proyecto Completa

```
CogniCare-App/
├── src/                    # Frontend (Next.js + React)
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   └── services/
│   │       └── api-client.ts  # ← NUEVO: Cliente HTTP para backend
│   └── ...
│
├── backend/                # ← NUEVO: Backend FastAPI
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
│
├── docker-compose.yml      # ← NUEVO
├── nginx.conf              # ← NUEVO
├── .github/                # ← NUEVO: CI/CD
│   └── workflows/
│       └── ci.yml
│
├── .env.local              # (gitignored)
├── .env.example            # (actualizar con nuevas vars)
├── .gitignore
├── ARQUITECTURA.md
└── README.md
```

---

## 🔄 Flujo de Datos (Nueva Arquitectura)

```
┌─────────────────────────────────┐
│   Frontend (Next.js + React)    │
│   - SessionProvider (NextAuth)  │
│   - API Client (axios/fetch)    │
└────────────────┬────────────────┘
                 │ HTTP/JWT
                 ↓
        ┌────────────────┐
        │  Nginx/Proxy   │
        └────────┬───────┘
                 │
    ┌────────────┴────────────┐
    ↓                         ↓
┌─────────────────┐  ┌──────────────────┐
│ FastAPI Backend │  │ Static Assets    │
│ - Routes        │  │ (Next.js build)  │
│ - Services      │  └──────────────────┘
│ - Middleware    │
│ - Auth Checks   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ↓         ↓          ↓          ↓
┌──────┐ ┌─────────┐ ┌──────┐ ┌──────────┐
│Cosmos│ │  Redis  │ │Azure │ │Azure AD  │
│  DB  │ │ (Cache)│ │  AI  │ │(Entra ID)│
└──────┘ └─────────┘ └──────┘ └──────────┘
```

---

## 📦 Dependencias FastAPI (requirements.txt)

```
# Core
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.0.0

# Async
asyncio==3.4.3
aiofiles==23.2.1

# Database
motor==3.3.1  # Async MongoDB driver
beanie==1.26.0  # Async ODM
# O si usas Cosmos:
# azure-cosmos==4.5.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Validation
pydantic==2.5.0
pydantic-settings==2.1.0
email-validator==2.1.0

# Azure Services
azure-ai-inference==1.0.0
azure-identity==1.16.0

# Cache/Queue
redis==5.0.1
celery==5.3.4

# Security
python-cors==1.0.1

# Logging
loguru==0.7.2

# Rate Limiting
slowapi==0.1.9

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2

# Linting/Formatting
black==23.12.0
isort==5.13.2
flake8==6.1.0
mypy==1.7.0

# File Parsing
python-pptx==0.6.21
python-docx==0.8.11
PyPDF2==3.16.0
```

---

## 🎯 Prioridades por Fase

### Envergadura (Timeframes sugeridos)

**SEMANA 1-2: FASE 1 + 2**
- Estructura FastAPI
- Separar lógica frontend
- Configurar Cosmos Emulator

**SEMANA 2-3: FASE 3 + 4**
- Async operations
- Seguridad (JWT, CORS, validación)
- Variables de entorno

**SEMANA 3-4: FASE 5 + 6**
- Docker + Compose
- Testing unitario
- Linting/Formato

**SEMANA 4+: FASE 7 + 8**
- Monitoreo
- CI/CD
- Optimización

---

## ✅ Checklist de Implementación

### Backend Base
- [ ] Crear `/backend` con estructura modular
- [ ] Configurar FastAPI main
- [ ] Definir Pydantic schemas
- [ ] Health check endpoint

### Desacoplamiento Frontend
- [ ] Crear API client en `/src/lib/services/api-client.ts`
- [ ] Reemplazar server actions con llamadas HTTP
- [ ] Configurar NEXT_PUBLIC_API_URL

### Autenticación
- [ ] Implementar JWT validation en FastAPI
- [ ] Middleware de autenticación
- [ ] Endpoint de logout

### Base de Datos
- [ ] Configurar Cosmos Emulator/MongoDB
- [ ] Crear repositorios (message, user, preference)
- [ ] Fixtures de prueba

### Async/Await
- [ ] Rutas async en FastAPI
- [ ] Connection pooling
- [ ] Manejo de concurrencia

### Docker
- [ ] Dockerfile backend
- [ ] Dockerfile frontend
- [ ] docker-compose.yml
- [ ] nginx.conf

### Testing
- [ ] Fixtures pytest
- [ ] Tests unitarios (servicios)
- [ ] Tests de integración (API)
- [ ] Cobertura 80%+

### CI/CD
- [ ] Workflow GitHub Actions
- [ ] Linting checks
- [ ] Test coverage gates

---

## 📚 Referencias

- [FastAPI Async](https://fastapi.tiangolo.com/async-sql-databases/)
- [Azure Cosmos DB Emulator](https://learn.microsoft.com/cosmos-db/emulator)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)
- [Pytest Async Testing](https://pytest-asyncio.readthedocs.io/)
- [JWT en FastAPI](https://fastapi.tiangolo.com/advanced/security/oauth2-jwt/)

---

**Próximos pasos:** Comenzar FASE 1 - Crear estructura de backend FastAPI

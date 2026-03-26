# 🔄 Plan de Migración: Frontend Logic → Backend (Clean Architecture)

**Objetivo:** Migrar lógica de negocio del frontend al backend de forma gradual, estructurada y con validación en cada paso.

**Beneficios:**
- ✅ Single source of truth (backend)
- ✅ Frontend más ligero (solo presentación)
- ✅ APIs reutilizables (móvil, otros clientes)
- ✅ Lógica centralizada y testeable
- ✅ Seguridad mejorada (validaciones servidor)

---

## 📋 Arquitectura Destino (Clean Architecture)

```
CAPA DE PRESENTACIÓN (Frontend)
  ↓ HTTP API Calls
CAPA DE APLICACIÓN (API Routes)
  ↓ Orchestration
CAPA DE SERVICIO (Business Logic)
  ↓ Domain Rules
CAPA DE REPOSITORIO (Data Access)
  ↓ SQL/NoSQL Queries
BASE DE DATOS (Azure Cosmos DB)
```

---

## 🎯 FASE 1: Infraestructura Base (Week 1)
**Objetivo:** Establecer las capas de servicio y crear DTOs reutilizables

### 1.1 crear DTOs (Data Transfer Objects)
```
backend/app/dto/
  ├── message_dto.py
  ├── preference_dto.py
  └── user_dto.py
```

**Qué va:**
- `CreateMessageDTO` - Input validation
- `MessageResponseDTO` - Response format
- `UpdatePreferenceDTO` - Update validation

### 1.2 crear Service Layer (Lógica de Negocio)
```
backend/app/service/
  ├── message_service.py     # CRUD + búsqueda + ranking
  ├── preference_service.py  # Gestión de preferencias
  └── user_service.py        # Perfiles + estadísticas
```

**Qué va:**
- Validaciones complejas
- Cálculos
- Transformaciones

### 1.3 crear API Routes (Endpoints)
```
backend/app/api/routes/
  ├── messages.py      # GET /api/messages, POST, PUT, DELETE
  ├── preferences.py   # GET /api/preferences, POST, PUT
  └── users.py         # GET /api/users, POST
```

### 1.4 Test cada componente
```bash
# Test service
pytest tests/unit/test_message_service.py

# Test API endpoint
pytest tests/integration/test_messages_api.py

# Manual
curl http://localhost:8000/api/messages -H "Authorization: Bearer <token>"
```

---

## 🎯 FASE 2: Logger Message (Week 1-2)
**Entidad más simple para validar arquitectura**

### 2.1 Domain Model
```python
# backend/app/domain/message.py
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

class MessageType(Enum):
    LEARNING = "learning"
    REFLECTION = "reflection"
    QUESTION = "question"

@dataclass
class Message:
    id: str
    user_id: str
    content: str
    message_type: MessageType
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    
    def validate(self) -> bool:
        """Domain validation"""
        return len(self.content) > 0 and len(self.content) <= 2000
```

### 2.2 DTOs
```python
# backend/app/dto/message_dto.py
from pydantic import BaseModel, Field

class CreateMessageDTO(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: str = Field(..., pattern="^(learning|reflection|question)$")
    tags: list[str] = Field(default_factory=list, max_items=10)

class MessageResponseDTO(BaseModel):
    id: str
    user_id: str
    content: str
    message_type: str
    tags: list[str]
    created_at: str
    updated_at: str
```

### 2.3 Service
```python
# backend/app/service/message_service.py
from app.domain.message import Message, MessageType

class MessageService:
    def __init__(self, repository: CosmosRepository):
        self.repository = repository
    
    async def create_message(
        self, user_id: str, dto: CreateMessageDTO
    ) -> MessageResponseDTO:
        """Create message with validation"""
        # Validate DTO
        message = Message(
            id=generate_id(),
            user_id=user_id,
            content=dto.content.strip(),
            message_type=MessageType[dto.message_type.upper()],
            tags=[t.lower() for t in dto.tags],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Validate domain rules
        if not message.validate():
            raise ValidationError("Invalid message")
        
        # Persist
        item = asdict(message)
        saved = await self.repository.create(item)
        
        return MessageResponseDTO(**saved)
```

### 2.4 API Route
```python
# backend/app/api/routes/messages.py
from fastapi import APIRouter, Depends, HTTPException
from app.dto.message_dto import CreateMessageDTO, MessageResponseDTO
from app.service.message_service import MessageService

router = APIRouter(prefix="/api/messages", tags=["messages"])

@router.post("", response_model=MessageResponseDTO)
async def create_message(
    user_id: str,  # From auth token
    dto: CreateMessageDTO,
    service: MessageService = Depends()  # Injected
) -> MessageResponseDTO:
    """Create a new learning message"""
    return await service.create_message(user_id, dto)

@router.get("", response_model=list[MessageResponseDTO])
async def list_messages(
    user_id: str,
    skip: int = 0,
    limit: int = 10,
    service: MessageService = Depends()
) -> list[MessageResponseDTO]:
    """List user's learning messages"""
    return await service.list_messages(user_id, skip, limit)
```

### 2.5 Test & Validar
```bash
# Unit test
pytest tests/unit/test_message_service.py -v

# Integration test
pytest tests/integration/test_messages_api.py -v

# Manual test
curl -X POST http://localhost:8000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Aprendí sobre arquitectura limpia",
    "message_type": "learning",
    "tags": ["architecture", "backend"]
  }'

# Verify in DB
curl http://localhost:8000/api/messages?user_id=user-123
```

---

## 🎯 FASE 3: Preference (Week 2-3)
**Entidad con relaciones y lógica más compleja**

### 3.1 Domain Model
```python
# backend/app/domain/preference.py
@dataclass
class Preference:
    id: str
    user_id: str
    learning_style: str  # "visual", "auditory", "kinesthetic"
    notification_enabled: bool
    frequency: str  # "daily", "weekly", "monthly"
    languages: list[str]
    created_at: datetime
    updated_at: datetime
```

### 3.2 Service Logic
```python
class PreferenceService:
    async def update_preference(
        self, user_id: str, dto: UpdatePreferenceDTO
    ) -> PreferenceResponseDTO:
        """Update with validation"""
        # Get existing
        existing = await self.repository.get(user_id, f"preference-{user_id}")
        
        # Merge
        updated = {**existing, **dto.dict(exclude_unset=True)}
        
        # Validate
        if updated['frequency'] not in ['daily', 'weekly', 'monthly']:
            raise ValidationError("Invalid frequency")
        
        # Persist
        saved = await self.repository.update(updated)
        return PreferenceResponseDTO(**saved)
```

### 3.3 Routes & Test
Similar to Phase 2...

---

## 🎯 FASE 4: Testing & Documentación (Week 3)
**Validar toda la arquitectura**

### 4.1 Test Coverage
```bash
# Unit tests
pytest tests/unit/test_*.py -v --cov=app

# Integration tests
pytest tests/integration/ -v

# API validation
pytest tests/api/ -v

# E2E (optional)
pytest tests/e2e/ -v
```

### 4.2 Documentation
- [ ] API OpenAPI Swagger (`/docs`)
- [ ] README con ejemplos
- [ ] Architecture decision records (ADR)

---

## 📊 Progress Tracker

| Fase | Componente | Estado | Tests | Docs | Frontend Ready |
|------|-----------|--------|-------|------|---|
| 1 | DTOs | ⏳ TODO | - | - | - |
| 1 | Service Base | ⏳ TODO | - | - | - |
| 1 | Dependencies | ⏳ TODO | - | - | - |
| 2 | Message Domain | ⏳ TODO | - | - | - |
| 2 | Message Service | ⏳ TODO | ⏳ TODO | - | - |
| 2 | Message Routes | ⏳ TODO | ⏳ TODO | ✅ YES | ✅ YES |
| 3 | Preference Domain | ⏳ TODO | - | - | - |
| 3 | Preference Service | ⏳ TODO | ⏳ TODO | - | - |
| 3 | Preference Routes | ⏳ TODO | ⏳ TODO | ✅ YES | ✅ YES |
| 4 | Testing | ⏳ TODO | ⏳ TODO | ⏳ TODO | - |
| 4 | Docs | ⏳ TODO | - | ✅ YES | - |

---

## 🔧 Frontend -> Backend Mapping (Qué Migrar)

### Messages
```
Frontend: createMessage()    → Backend: POST /api/messages
Frontend: updateMessage()    → Backend: PUT /api/messages/{id}
Frontend: deleteMessage()    → Backend: DELETE /api/messages/{id}
Frontend: getMessages()      → Backend: GET /api/messages
Frontend: searchMessages()   → Backend: GET /api/messages?query=...&tags=...
Frontend: filterByDate()     → Backend: GET /api/messages?from_date=...&to_date=...
```

### Preferences
```
Frontend: getPreferences()   → Backend: GET /api/preferences
Frontend: updatePreferences()→ Backend: PUT /api/preferences
```

### Users
```
Frontend: getUserProfile()   → Backend: GET /api/users/{user_id}
Frontend: updateProfile()    → Backend: PUT /api/users/{user_id}
```

---

## ✅ Criterios de Éxito

- ✅ Backend API completa y documentada (`/docs`)
- ✅ 80%+ test coverage
- ✅ Frontend llamando only to backend (sin lógica local)
- ✅ Validaciones en servidor (no confiar en cliente)
- ✅ Manejo de errores consistente
- ✅ Autenticación integrada (auth tokens)
- ✅ CORS configurado correctamente

---

## 📝 Comandos Útiles

```bash
# Ver cambios en desarrollo
docker compose logs -f backend

# Test específico
pytest tests/unit/test_message_service.py::test_create_message -v

# Coverage
pytest --cov=app tests/

# Swagger docs
curl http://localhost:8000/docs

# Health check
curl http://localhost:8000/health
```

---

## 🎯 Next Step

→ **Fase 1.1: Crear DTOs base**
- [ ] Crear `backend/app/dto/message_dto.py`
- [ ] Crear `backend/app/dto/preference_dto.py`
- [ ] Crear `backend/app/domain/message.py`
- [ ] Crear tests para DTOs


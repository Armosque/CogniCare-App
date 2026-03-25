
## 🚀 Quick Start - Local Development

### Requisitos

- **Docker** y **Docker Compose** instalados
  ```bash
  docker --version        # v25+
  docker compose version  # v2.x
  ```
- **Puertos disponibles**: 3000 (frontend), 8000 (backend)
- **`.env`** en la raíz con las variables requeridas:

### Ejecutar

```bash
cd /home/afelopez/Projects/CogniCare-App
docker compose up --build
```

Espera ~30 segundos. Deberías ver:
```
backend   | INFO: Uvicorn running on http://0.0.0.0:8000
frontend  | ready - started server on 0.0.0.0:3000
```

### Verificar que funciona

```bash
# En otra terminal
curl http://localhost:3000          # Frontend OK
curl http://localhost:8000/health   # Backend: {"status":"healthy"}
```

### Debuguear si falla

| Problema | Solución |
|----------|----------|
| **"Port already in use"** | `lsof -i :8000 && lsof -i :3000` → `kill -9 <PID>` |
| **Backend error: ConfigError** | Verificar `.env.local` tiene AZURE_COSMOS_ENDPOINT, AZURE_COSMOS_KEY |
| **Backend connection timeout** | Verificar que tu Cosmos DB en Azure está accesible y la key es correcta |
| **Container exitea inmediatamente** | `docker compose logs backend` o `docker compose logs frontend` para ver el error |
| **Limpiar todo y empezar** | `docker compose down` luego `docker compose up --build` |



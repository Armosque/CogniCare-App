"""
API routes - Cómo agregar nuevas rutas

Cuando agregues nuevas funcionalidades (Messages, Preferences, etc.):

1. Crea un archivo en backend/app/api/routes/

    Ejemplo: backend/app/api/routes/messages.py
    
    ```python
    from fastapi import APIRouter
    router = APIRouter(prefix="/api/messages", tags=["messages"])
    
    @router.get("/")
    async def list_messages():
        # Implementation
        pass
    
    @router.post("/")
    async def create_message():
        # Implementation
        pass
    ```

2. Registra la ruta en main.py

    En la función create_app(), agrega:
    
    ```python
    from app.api.routes.messages import router as messages_router
    app.include_router(messages_router)
    ```

3. Las excepciones se manejan automáticamente

    Los exception handlers en exception_handlers.py
    captarán todas las excepciones personalizadas.
"""

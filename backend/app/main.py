"""
FastAPI application main entry point for CogniCare backend
Uses Clean Architecture with proper separation of concerns

This module is responsible ONLY for:
1. Creating the FastAPI application instance
2. Registering lifespan events (startup/shutdown)
3. Registering exception handlers
4. Registering routes

All business logic, middleware, and exceptions are delegated to their respective modules.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.dependencies import close_dependencies, init_dependencies
from app.api.exception_handlers import cognicare_exception_handler, general_exception_handler
from app.api.middleware import setup_middleware
from app.api.routes.health import router as health_router
from app.api.routes.messages import router as messages_router
from app.api.routes.preferences import router as preferences_router
from app.api.routes.users import router as users_router
from app.api.routes.auth import router as auth_router
from app.core.exceptions import CogniCareException

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ======== Application Factory ========
def create_app() -> FastAPI:
    """
    Create and configure FastAPI application
    
    Returns:
        Configured FastAPI instance
    """
    app = FastAPI(
        title="CogniCare API",
        description="API Backend for CogniCare - Learning Analytics Platform",
        version="0.1.0",
        lifespan=lifespan,
    )
    
    # Register middleware
    setup_middleware(app)
    
    # Register exception handlers
    app.add_exception_handler(CogniCareException, cognicare_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Register routes
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(messages_router)
    app.include_router(preferences_router)
    app.include_router(users_router)
    
    return app


# ======== Lifespan Events ========
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle application startup and shutdown
    
    Startup:
    - Initialize all external service clients (Cosmos DB)
    - Perform health checks
    
    Shutdown:
    - Gracefully close all connections
    - Clean up resources
    """
    logger.info("🚀 CogniCare Backend Starting...")
    try:
        await init_dependencies()
        logger.info("✓ All dependencies initialized successfully")
        yield
    except Exception as e:
        logger.error(f"✗ Failed to initialize dependencies: {e}", exc_info=True)
        raise
    finally:
        logger.info("🛑 CogniCare Backend Shutting Down...")
        try:
            await close_dependencies()
            logger.info("✓ All dependencies closed gracefully")
        except Exception as e:
            logger.error(f"✗ Error closing dependencies: {e}", exc_info=True)


# ======== Application Instance ========
app = create_app()



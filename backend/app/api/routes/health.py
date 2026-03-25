"""
Health check routes for CogniCare API
Used for orchestration, load balancers, and monitoring
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> JSONResponse:
    """
    Health check endpoint for orchestration/monitoring
    
    Used by:
    - Docker health checks
    - Kubernetes liveness probes
    - Load balancers
    - Application monitoring
    
    Returns:
        JSON with service status and metadata
    """
    settings = get_settings()
    
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "cognicare-api",
            "version": "0.1.0",
            "environment": "development" if settings.is_debug else "production",
        },
    )

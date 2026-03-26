"""
Middleware configuration for CogniCare API
Handles CORS, security headers, and other cross-cutting concerns
"""

from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


def setup_middleware(app: FastAPI) -> None:
    """
    Configure all middleware for the FastAPI application
    
    Args:
        app: FastAPI application instance
    """
    settings = get_settings()
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_get_cors_origins(settings),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],  # Allow all headers including Authorization
        expose_headers=["Authorization"],  # Expose auth headers to client
    )


def _get_cors_origins(settings) -> List[str]:
    """
    Build list of allowed CORS origins based on environment
    
    Args:
        settings: Application settings
        
    Returns:
        List of allowed origins
    """
    origins = [
        "http://localhost:3000",      # Local frontend
        "http://frontend:3000",        # Docker compose frontend
        settings.FRONTEND_URL,         # Configured frontend URL
    ]
    
    # Remove duplicates and None values
    return list(set(o for o in origins if o))

"""Dependency injection setup"""

import logging
from typing import Optional

from app.infrastructure.cosmos_client import CosmosDBClient
from app.repository.cosmos_repository import CosmosRepository
from app.service.base import BaseService

logger = logging.getLogger(__name__)

# Global instances (will be initialized at startup)
_cosmos_client: Optional[CosmosDBClient] = None


async def init_dependencies() -> None:
    """Initialize all dependencies"""
    global _cosmos_client

    try:
        logger.info("Initializing dependencies...")

        # Initialize Cosmos DB
        _cosmos_client = CosmosDBClient()
        await _cosmos_client.initialize()

        logger.info("Dependencies initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize dependencies: {str(e)}")
        raise


async def close_dependencies() -> None:
    """Close all dependencies"""
    global _cosmos_client

    try:
        logger.info("Closing dependencies...")

        if _cosmos_client:
            await _cosmos_client.close()

        logger.info("Dependencies closed successfully")
    except Exception as e:
        logger.error(f"Error closing dependencies: {str(e)}")


def get_cosmos_client() -> CosmosDBClient:
    """Get Cosmos DB client instance"""
    if _cosmos_client is None:
        raise RuntimeError("Cosmos DB client not initialized")
    return _cosmos_client


def get_repository(container_id: str) -> CosmosRepository:
    """Get repository for a container"""
    cosmos_client = get_cosmos_client()
    database = cosmos_client.get_database()
    container = database.get_container_client(container_id)
    return CosmosRepository(container)


def get_user_repository():
    """Get user repository with users container"""
    from app.repository.user_repository import UserRepository
    cosmos_client = get_cosmos_client()
    database = cosmos_client.get_database()
    users_container = database.get_container_client("users")
    return UserRepository(container=users_container)


# ====== Authentication Dependencies ======
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.service.auth_service import AuthenticationService
from app.core.exceptions import CogniCareException

security = HTTPBearer()


async def get_current_user_id(credentials = Depends(security)) -> str:
    """
    Extract user_id from JWT bearer token
    
    Args:
        credentials: HTTP bearer credentials from Authorization header
        
    Returns:
        User ID from token
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    try:
        auth_service = AuthenticationService()
        user_id = auth_service.extract_user_from_token(credentials.credentials)
        return user_id
    except CogniCareException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

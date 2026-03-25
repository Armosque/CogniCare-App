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

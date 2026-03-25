"""Base service class"""

import logging
from typing import Any, Dict, Generic, List, Optional, TypeVar

from app.repository.base import IBaseRepository

T = TypeVar("T")
logger = logging.getLogger(__name__)


class BaseService(Generic[T]):
    """Base service class - encapsulates business logic"""

    def __init__(self, repository: IBaseRepository):
        """
        Initialize service with repository
        
        Args:
            repository: Repository instance implementing IBaseRepository
        """
        self.repository = repository

    async def create(self, item: T) -> T:
        """Create a new item"""
        logger.info(f"Creating {self.__class__.__name__}")
        return await self.repository.create(item)

    async def get(self, user_id: str, item_id: str) -> Optional[T]:
        """Get item by ID"""
        logger.info(f"Fetching {self.__class__.__name__} with ID: {item_id}")
        return await self.repository.get(user_id, item_id)

    async def get_all(self, user_id: str) -> List[T]:
        """Get all items for a user"""
        logger.info(f"Fetching all {self.__class__.__name__} for user: {user_id}")
        return await self.repository.get_all(user_id)

    async def update(self, item: T) -> T:
        """Update an item"""
        logger.info(f"Updating {self.__class__.__name__}")
        return await self.repository.update(item)

    async def delete(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        logger.info(f"Deleting {self.__class__.__name__} with ID: {item_id}")
        return await self.repository.delete(user_id, item_id)

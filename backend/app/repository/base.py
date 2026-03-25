"""Base repository interface (Repository Pattern)"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, TypeVar

T = TypeVar("T")


class IBaseRepository(ABC, Generic[T]):
    """Base repository interface - defines contract for data access"""

    @abstractmethod
    async def create(self, item: T) -> T:
        """Create a new item"""
        pass

    @abstractmethod
    async def get(self, user_id: str, item_id: str) -> Optional[T]:
        """Get item by ID"""
        pass

    @abstractmethod
    async def get_all(self, user_id: str) -> List[T]:
        """Get all items for a user"""
        pass

    @abstractmethod
    async def update(self, item: T) -> T:
        """Update an item"""
        pass

    @abstractmethod
    async def delete(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        pass

    @abstractmethod
    async def query(self, user_id: str, query: str, parameters: Optional[List[Dict[str, Any]]] = None) -> List[T]:
        """Execute a custom query"""
        pass

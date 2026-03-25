"""Cosmos DB repository implementation"""

import logging
from typing import Any, Dict, List, Optional

from azure.cosmos import exceptions

from app.core.exceptions import EntityNotFoundError, RepositoryError
from app.repository.base import IBaseRepository

logger = logging.getLogger(__name__)


class CosmosRepository(IBaseRepository):
    """Cosmos DB implementation of IBaseRepository"""

    def __init__(self, container: Any):
        """
        Initialize Cosmos repository
        
        Args:
            container: Azure Cosmos DB container instance
        """
        self.container = container

    async def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item in Cosmos DB"""
        try:
            logger.info(f"Creating item: {item.get('id')}")
            created_item = self.container.create_item(item)
            return created_item
        except exceptions.CosmosResourceExistsError:
            raise RepositoryError(f"Item with ID '{item.get('id')}' already exists")
        except Exception as e:
            logger.error(f"Error creating item: {str(e)}")
            raise RepositoryError(f"Failed to create item: {str(e)}")

    async def get(self, user_id: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get item by ID"""
        try:
            logger.info(f"Fetching item: {item_id} for user: {user_id}")
            item = self.container.read_item(item=item_id, partition_key=user_id)
            return item
        except exceptions.CosmosResourceNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Error fetching item: {str(e)}")
            raise RepositoryError(f"Failed to fetch item: {str(e)}")

    async def get_all(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all items for a user"""
        try:
            logger.info(f"Fetching all items for user: {user_id}")
            query = "SELECT * FROM c WHERE c.user_id = @user_id"
            items = list(
                self.container.query_items(
                    query=query,
                    parameters=[{"name": "@user_id", "value": user_id}],
                )
            )
            return items
        except Exception as e:
            logger.error(f"Error fetching items: {str(e)}")
            raise RepositoryError(f"Failed to fetch items: {str(e)}")

    async def update(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Update an item"""
        try:
            logger.info(f"Updating item: {item.get('id')}")
            updated_item = self.container.upsert_item(item)
            return updated_item
        except Exception as e:
            logger.error(f"Error updating item: {str(e)}")
            raise RepositoryError(f"Failed to update item: {str(e)}")

    async def delete(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        try:
            logger.info(f"Deleting item: {item_id} for user: {user_id}")
            self.container.delete_item(item=item_id, partition_key=user_id)
            return True
        except exceptions.CosmosResourceNotFoundError:
            raise EntityNotFoundError("Item", item_id)
        except Exception as e:
            logger.error(f"Error deleting item: {str(e)}")
            raise RepositoryError(f"Failed to delete item: {str(e)}")

    async def query(
        self,
        user_id: str,
        query: str,
        parameters: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """Execute a custom query"""
        try:
            logger.info(f"Executing query for user: {user_id}")
            if parameters is None:
                parameters = []

            # Always filter by user_id for security
            if "@user_id" not in str(parameters):
                parameters.append({"name": "@user_id", "value": user_id})
                if "WHERE" in query and "user_id" not in query:
                    query = query.replace("WHERE", "WHERE c.user_id = @user_id AND")

            items = list(self.container.query_items(query=query, parameters=parameters))
            return items
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise RepositoryError(f"Failed to execute query: {str(e)}")

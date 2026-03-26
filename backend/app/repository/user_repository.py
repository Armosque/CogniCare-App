"""
User Repository for Cosmos DB async operations
"""
from datetime import datetime
from typing import Optional
from loguru import logger
from azure.cosmos.aio import ContainerProxy
from azure.cosmos import exceptions

from app.domain.user_auth import User
from app.core.exceptions import CogniCareException


class UserRepository:
    """Repository for user data access operations using Cosmos DB"""

    def __init__(self, container: Optional[ContainerProxy] = None):
        """
        Initialize user repository
        
        Args:
            container: Azure Cosmos DB container instance
        """
        self.container = container

    async def create_user(self, user: User) -> User:
        """
        Create a new user
        
        Args:
            user: User domain model
            
        Returns:
            Created user
            
        Raises:
            CogniCareException: If user already exists or creation fails
        """
        if not self.container:
            raise CogniCareException("Database container not initialized")
            
        try:
            # Check if user already exists
            existing = await self.get_by_email(user.email)
            if existing:
                raise CogniCareException("User already exists")
            
            # Prepare document for Cosmos DB
            user_dict = {
                "id": user.user_id,
                "email": user.email,
                "name": user.name,
                "hashed_password": user.hashed_password,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
                "type": "user",
            }
            
            await self.container.create_item(user_dict)
            logger.info(f"User created: {user.user_id}")
            return user
            
        except CogniCareException:
            raise
        except exceptions.CosmosResourceExistsError:
            raise CogniCareException("User already exists")
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise CogniCareException("Failed to create user")

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            user_id: User identifier
            
        Returns:
            User or None if not found
        """
        if not self.container:
            raise CogniCareException("Database container not initialized")
            
        try:
            query = "SELECT * FROM c WHERE c.id = @user_id AND c.type = 'user'"
            items = []
            async for item in self.container.query_items(query=query, parameters=[{"name": "@user_id", "value": user_id}]):
                items.append(item)
                
            if not items:
                return None
                
            return self._map_to_domain(items[0])
            
        except exceptions.CosmosResourceNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Error retrieving user by ID: {e}")
            return None

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email
        
        Args:
            email: User email
            
        Returns:
            User or None if not found
        """
        if not self.container:
            raise CogniCareException("Database container not initialized")
            
        try:
            query = "SELECT * FROM c WHERE c.email = @email AND c.type = 'user' LIMIT 1"
            
            items = []
            async for item in self.container.query_items(
                query=query,
                parameters=[{"name": "@email", "value": email}]
            ):
                items.append(item)
            
            if not items:
                return None
            
            return self._map_to_domain(items[0])
            
        except Exception as e:
            logger.error(f"Error retrieving user by email: {e}")
            return None

    async def update_user(self, user: User) -> User:
        """
        Update an existing user
        
        Args:
            user: User domain model with updated data
            
        Returns:
            Updated user
            
        Raises:
            CogniCareException: If user not found or update fails
        """
        if not self.container:
            raise CogniCareException("Database container not initialized")
            
        try:
            # Verify user exists
            existing = await self.get_by_email(user.email)
            if not existing:
                raise CogniCareException("User not found")
            
            user_dict = {
                "id": user.user_id,
                "email": user.email,
                "name": user.name,
                "hashed_password": user.hashed_password,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
                "type": "user",
            }
            
            await self.container.replace_item(user.user_id, user_dict)
            logger.info(f"User updated: {user.user_id}")
            return user
            
        except CogniCareException:
            raise
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            raise CogniCareException("Failed to update user")

    async def delete_user(self, user_id: str) -> bool:
        """
        Delete a user
        
        Args:
            user_id: User identifier
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            CogniCareException: If deletion fails
        """
        if not self.container:
            raise CogniCareException("Database container not initialized")
            
        try:
            # First get the user
            user = await self.get_by_id(user_id)
            if not user:
                return False
                
            await self.container.delete_item(user_id, partition_key=user_id)
            logger.info(f"User deleted: {user_id}")
            return True
            
        except exceptions.CosmosResourceNotFoundError:
            return False
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            raise CogniCareException("Failed to delete user")

    @staticmethod
    def _map_to_domain(item: dict) -> User:
        """
        Map Cosmos DB item to User domain model
        
        Args:
            item: Cosmos DB document
            
        Returns:
            User domain model
        """
        from datetime import datetime
        
        return User(
            user_id=item.get("id"),
            email=item.get("email"),
            name=item.get("name"),
            hashed_password=item.get("hashed_password", ""),
            is_active=item.get("is_active", True),
            created_at=datetime.fromisoformat(item.get("created_at", datetime.utcnow().isoformat())),
            updated_at=datetime.fromisoformat(item.get("updated_at", datetime.utcnow().isoformat())),
        )

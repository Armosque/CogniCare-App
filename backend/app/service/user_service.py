"""User profile business logic service"""

import logging
from typing import Optional
from uuid import uuid4
from datetime import datetime

from app.domain.user import UserProfile
from app.dto.user_dto import (
    CreateUserDTO,
    UpdateUserDTO,
    UserProfileDTO,
    UserStatisticsDTO
)
from app.repository.base import IBaseRepository
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class UserService:
    """Service for managing user profiles"""

    def __init__(self, repository: IBaseRepository):
        """
        Initialize user service
        
        Args:
            repository: Repository instance for data access
        """
        self.repository = repository

    async def create_user(
        self, user_id: str, dto: CreateUserDTO
    ) -> UserProfileDTO:
        """
        Create a new user profile
        
        Args:
            user_id: User ID (email or UUID)
            dto: User creation DTO
            
        Returns:
            UserProfileDTO with created user
            
        Raises:
            ValidationError: If user data is invalid
        """
        try:
            # Create domain model
            user = UserProfile(
                id=user_id,
                email=dto.email,
                name=dto.name,
                bio=dto.bio
            )

            # Validate domain rules
            if not user.validate():
                raise ValidationError("User profile failed validation")

            # Persist
            item_data = user.to_dict()
            saved = await self.repository.create(item_data)

            logger.info(f"User created: {user.id}")
            return self._to_profile_dto(saved)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise ValidationError(f"Failed to create user: {str(e)}")

    async def get_user(self, user_id: str) -> Optional[UserProfileDTO]:
        """
        Get user profile by ID
        
        Args:
            user_id: User ID
            
        Returns:
            UserProfileDTO or None if not found
        """
        try:
            # User profile is stored with ID = user_id and partition_key = user_id
            item = await self.repository.get(user_id, user_id)
            if not item:
                return None
            return self._to_profile_dto(item)
        except Exception as e:
            logger.error(f"Error fetching user: {str(e)}")
            raise

    async def update_user(
        self, user_id: str, dto: UpdateUserDTO
    ) -> UserProfileDTO:
        """
        Update user profile (partial update)
        
        Args:
            user_id: User ID
            dto: User update DTO
            
        Returns:
            Updated UserProfileDTO
            
        Raises:
            ValidationError: If user data is invalid
        """
        try:
            # Get existing user
            existing = await self.repository.get(user_id, user_id)
            
            if not existing:
                raise ValidationError("User not found")
            
            # Update only provided fields
            updated_data = existing.copy()
            
            if dto.email:
                updated_data["email"] = dto.email
            if dto.name:
                updated_data["name"] = dto.name
            if dto.bio is not None:  # Allow clearing bio with empty string
                updated_data["bio"] = dto.bio
            
            updated_data["updated_at"] = datetime.utcnow().isoformat()

            # Persist using upsert
            saved = await self.repository.update(updated_data)

            logger.info(f"User updated: {user_id}")
            return self._to_profile_dto(saved)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            raise ValidationError(f"Failed to update user: {str(e)}")

    async def record_activity(self, user_id: str) -> None:
        """
        Update last_activity timestamp for a user
        
        Args:
            user_id: User ID
        """
        try:
            existing = await self.repository.get(user_id, user_id)
            if existing:
                existing["last_activity"] = datetime.utcnow().isoformat()
                await self.repository.update(existing)
                logger.debug(f"Activity recorded for user: {user_id}")
        except Exception as e:
            logger.warning(f"Could not record activity for user {user_id}: {str(e)}")
            # Don't raise - this is non-critical

    async def increment_message_count(self, user_id: str) -> None:
        """
        Increment total_messages counter for a user
        
        Args:
            user_id: User ID
        """
        try:
            existing = await self.repository.get(user_id, user_id)
            if existing:
                existing["total_messages"] = existing.get("total_messages", 0) + 1
                existing["last_activity"] = datetime.utcnow().isoformat()
                await self.repository.update(existing)
                logger.debug(f"Message count incremented for user: {user_id}")
        except Exception as e:
            logger.warning(f"Could not increment message count for user {user_id}: {str(e)}")
            # Don't raise - this is non-critical

    async def get_statistics(self, user_id: str) -> UserStatisticsDTO:
        """
        Get user activity statistics
        
        Args:
            user_id: User ID
            
        Returns:
            UserStatisticsDTO with user stats
        """
        try:
            item = await self.repository.get(user_id, user_id)
            if not item:
                # Return default stats for non-existent user
                return UserStatisticsDTO(
                    id=f"stats-{user_id}",
                    user_id=user_id,
                    total_messages=0,
                    total_reflections=0,
                    total_questions=0,
                    messages_this_month=0,
                    last_activity=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
            
            return UserStatisticsDTO(
                id=f"stats-{user_id}",
                user_id=user_id,
                total_messages=item.get("total_messages", 0),
                total_reflections=item.get("total_reflections", 0),
                total_questions=item.get("total_questions", 0),
                messages_this_month=item.get("messages_this_month", 0),
                last_activity=item.get("last_activity"),
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at")
            )

        except Exception as e:
            logger.error(f"Error fetching user statistics: {str(e)}")
            raise

    @staticmethod
    def _to_profile_dto(item: dict) -> UserProfileDTO:
        """Convert stored item to profile DTO"""
        # Convert ISO string timestamps to datetime objects
        created_at = item.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        updated_at = item.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        return UserProfileDTO(
            id=item.get("id"),
            user_id=item.get("id"),  # Use id as user_id
            email=item.get("email"),
            name=item.get("name"),
            bio=item.get("bio"),
            created_at=created_at,
            updated_at=updated_at
        )

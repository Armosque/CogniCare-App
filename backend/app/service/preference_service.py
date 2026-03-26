"""User preference business logic service"""

import logging
from typing import Optional
from uuid import uuid4
from datetime import datetime

from app.domain.preference import UserPreference, ReadingLevel, Tone
from app.dto.preference_dto import (
    CreatePreferenceDTO,
    UpdatePreferenceDTO,
    PreferenceResponseDTO
)
from app.repository.base import IBaseRepository
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class PreferenceService:
    """Service for managing user preferences"""

    def __init__(self, repository: IBaseRepository):
        """
        Initialize preference service
        
        Args:
            repository: Repository instance for data access
        """
        self.repository = repository

    async def create_preference(
        self, user_id: str, dto: CreatePreferenceDTO
    ) -> PreferenceResponseDTO:
        """
        Create user preferences with defaults
        
        Args:
            user_id: User ID
            dto: Preference creation DTO
            
        Returns:
            PreferenceResponseDTO with created preferences
            
        Raises:
            ValidationError: If preference data is invalid
        """
        try:
            # Create domain model
            preference = UserPreference(
                id=f"pref-{str(uuid4())}",
                user_id=user_id,
                reading_level=ReadingLevel(dto.reading_level),
                tone=Tone(dto.tone),
                high_contrast=dto.high_contrast,
                text_to_speech=dto.text_to_speech,
                languages=dto.languages,
                notification_enabled=dto.notification_enabled,
                notification_frequency=dto.notification_frequency
            )

            # Validate domain rules
            if not preference.validate():
                raise ValidationError("Preference failed validation")

            # Persist
            item_data = preference.to_dict()
            saved = await self.repository.create(item_data)

            logger.info(f"Preference created: {preference.id} for user: {user_id}")
            return self._to_response_dto(saved)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error creating preference: {str(e)}")
            raise ValidationError(f"Failed to create preference: {str(e)}")

    async def get_preference(self, user_id: str) -> Optional[PreferenceResponseDTO]:
        """
        Get user preferences
        
        Args:
            user_id: User ID
            
        Returns:
            PreferenceResponseDTO or None if not found
        """
        try:
            # Preferences are stored with ID = user_id
            item = await self.repository.get(user_id, f"pref-{user_id}")
            if not item:
                return None
            return self._to_response_dto(item)
        except Exception as e:
            logger.error(f"Error fetching preference: {str(e)}")
            raise

    async def update_preference(
        self, user_id: str, dto: UpdatePreferenceDTO
    ) -> PreferenceResponseDTO:
        """
        Update user preferences (partial update)
        
        Args:
            user_id: User ID
            dto: Preference update DTO (all fields optional)
            
        Returns:
            Updated PreferenceResponseDTO
            
        Raises:
            ValidationError: If preference data is invalid
        """
        try:
            # Get existing preference or create default
            pref_id = f"pref-{user_id}"
            existing = await self.repository.get(user_id, pref_id)
            
            if not existing:
                # Create default preference if doesn't exist
                logger.info(f"Creating default preference for user: {user_id}")
                default_dto = CreatePreferenceDTO()
                return await self.create_preference(user_id, default_dto)
            
            # Update only provided fields
            updated_data = existing.copy()
            
            if dto.reading_level:
                updated_data["reading_level"] = dto.reading_level
            if dto.tone:
                updated_data["tone"] = dto.tone
            if dto.high_contrast is not None:
                updated_data["high_contrast"] = dto.high_contrast
            if dto.text_to_speech is not None:
                updated_data["text_to_speech"] = dto.text_to_speech
            if dto.languages:
                updated_data["languages"] = dto.languages
            if dto.notification_enabled is not None:
                updated_data["notification_enabled"] = dto.notification_enabled
            if dto.notification_frequency:
                updated_data["notification_frequency"] = dto.notification_frequency
            
            updated_data["updated_at"] = datetime.utcnow().isoformat()

            # Persist using upsert
            saved = await self.repository.update(updated_data)

            logger.info(f"Preference updated for user: {user_id}")
            return self._to_response_dto(saved)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error updating preference: {str(e)}")
            raise ValidationError(f"Failed to update preference: {str(e)}")

    async def get_or_create_preference(self, user_id: str) -> PreferenceResponseDTO:
        """
        Get user preference or create default if doesn't exist
        
        Args:
            user_id: User ID
            
        Returns:
            PreferenceResponseDTO
        """
        existing = await self.get_preference(user_id)
        if existing:
            return existing
        
        # Create default preference
        default_dto = CreatePreferenceDTO()
        return await self.create_preference(user_id, default_dto)

    @staticmethod
    def _to_response_dto(item: dict) -> PreferenceResponseDTO:
        """Convert stored item to response DTO"""
        # Convert ISO string timestamps to datetime objects
        created_at = item.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        updated_at = item.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        return PreferenceResponseDTO(
            id=item.get("id"),
            user_id=item.get("user_id"),
            reading_level=item.get("reading_level", "simple"),
            tone=item.get("tone", "motivador"),
            high_contrast=item.get("high_contrast", False),
            text_to_speech=item.get("text_to_speech", False),
            languages=item.get("languages", ["es"]),
            notification_enabled=item.get("notification_enabled", True),
            notification_frequency=item.get("notification_frequency", "daily"),
            created_at=created_at,
            updated_at=updated_at
        )

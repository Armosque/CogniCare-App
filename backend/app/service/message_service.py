"""Message business logic service"""

import logging
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

from app.domain.message import Message, MessageRole, MessageType, MessageStep
from app.dto.message_dto import CreateMessageDTO, MessageResponseDTO, MessageStepDTO
from app.repository.base import IBaseRepository
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class MessageService:
    """Service for managing messages with business logic"""

    def __init__(self, repository: IBaseRepository):
        """
        Initialize message service
        
        Args:
            repository: Repository instance for data access
        """
        self.repository = repository

    async def create_message(
        self, user_id: str, dto: CreateMessageDTO
    ) -> MessageResponseDTO:
        """
        Create a new message with validation
        
        Args:
            user_id: User ID creating the message
            dto: Message creation DTO
            
        Returns:
            MessageResponseDTO with created message
            
        Raises:
            ValidationError: If message data is invalid
        """
        try:
            # Parse step DTOs
            steps = []
            for step_dto in dto.steps:
                steps.append(MessageStep(
                    title=step_dto.title,
                    bullets=step_dto.bullets,
                    duration=step_dto.duration
                ))

            # Create domain model
            message = Message(
                id=f"msg-{str(uuid4())}",
                user_id=user_id,
                role=MessageRole(dto.role),
                content=dto.content.strip(),
                timestamp=datetime.utcnow(),
                image=dto.image,
                document_text=dto.document_text,
                message_type=MessageType(dto.message_type),
                steps=steps,
                explanation=dto.explanation,
                tags=[tag.lower().strip() for tag in dto.tags]
            )

            # Validate domain rules
            if not message.validate():
                raise ValidationError("Message failed validation")

            # Persist
            item_data = message.to_dict()
            saved = await self.repository.create(item_data)

            logger.info(f"Message created: {message.id} for user: {user_id}")
            return self._to_response_dto(saved)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error creating message: {str(e)}")
            raise ValidationError(f"Failed to create message: {str(e)}")

    async def get_message(
        self, user_id: str, message_id: str
    ) -> Optional[MessageResponseDTO]:
        """
        Get a specific message by ID
        
        Args:
            user_id: User ID (partition key)
            message_id: Message ID to retrieve
            
        Returns:
            MessageResponseDTO or None if not found
        """
        try:
            item = await self.repository.get(user_id, message_id)
            if not item:
                return None
            return self._to_response_dto(item)
        except Exception as e:
            logger.error(f"Error fetching message: {str(e)}")
            raise

    async def list_messages(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[MessageResponseDTO]:
        """
        List messages for a user with pagination
        
        Args:
            user_id: User ID
            skip: Number of messages to skip
            limit: Maximum messages to return (max 50)
            
        Returns:
            List of MessageResponseDTOs
        """
        try:
            # Enforce max limit
            limit = min(limit, 50)
            
            items = await self.repository.get_all(user_id)
            
            # Apply pagination
            paginated = items[skip : skip + limit]
            
            return [self._to_response_dto(item) for item in paginated]

        except Exception as e:
            logger.error(f"Error listing messages: {str(e)}")
            raise

    async def delete_message(self, user_id: str, message_id: str) -> bool:
        """
        Delete a message
        
        Args:
            user_id: User ID (partition key)
            message_id: Message ID to delete
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            success = await self.repository.delete(user_id, message_id)
            if success:
                logger.info(f"Message deleted: {message_id} for user: {user_id}")
            return success
        except Exception as e:
            logger.error(f"Error deleting message: {str(e)}")
            raise

    async def search_messages(
        self, user_id: str, query: str, tags: Optional[List[str]] = None
    ) -> List[MessageResponseDTO]:
        """
        Search messages by content and/or tags
        
        Args:
            user_id: User ID
            query: Search query string
            tags: Optional list of tags to filter by
            
        Returns:
            List of matching MessageResponseDTOs
        """
        try:
            items = await self.repository.get_all(user_id)
            
            results = []
            query_lower = query.lower()
            
            for item in items:
                # Check if query matches content or explanation
                content_match = (
                    query_lower in item.get("content", "").lower()
                    or query_lower in (item.get("explanation") or "").lower()
                )
                
                # Check if tags match (if provided)
                tags_match = True
                if tags:
                    message_tags = [t.lower() for t in item.get("tags", [])]
                    tags_match = any(tag.lower() in message_tags for tag in tags)
                
                if content_match and tags_match:
                    results.append(self._to_response_dto(item))
            
            return results

        except Exception as e:
            logger.error(f"Error searching messages: {str(e)}")
            raise

    @staticmethod
    def _to_response_dto(item: dict) -> MessageResponseDTO:
        """Convert stored item to response DTO"""
        steps = [
            MessageStepDTO(**step) for step in item.get("steps", [])
        ]
        
        # Convert ISO string timestamps to datetime objects
        created_at = item.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        updated_at = item.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        timestamp = item.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        return MessageResponseDTO(
            id=item.get("id"),
            user_id=item.get("user_id"),
            role=item.get("role"),
            content=item.get("content"),
            timestamp=timestamp,
            message_type=item.get("message_type", "text"),
            image=item.get("image"),
            document_text=item.get("document_text"),
            steps=steps,
            explanation=item.get("explanation"),
            tags=item.get("tags", []),
            created_at=created_at,
            updated_at=updated_at
        )

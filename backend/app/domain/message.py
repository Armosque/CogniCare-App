"""Message domain entity - represents chat messages and learning artifacts"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class MessageRole(Enum):
    """Valid roles for messages"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageType(Enum):
    """Types of message content"""
    TEXT = "text"
    TASK_LIST = "task-list"
    SUMMARY = "summary"


@dataclass
class MessageStep:
    """Individual step in a task-list message"""
    title: str
    bullets: List[str] = field(default_factory=list)
    duration: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "title": self.title,
            "bullets": self.bullets,
            "duration": self.duration
        }


@dataclass
class Message:
    """Domain model for a chat/learning message"""
    id: str
    user_id: str
    role: MessageRole
    content: str
    timestamp: datetime
    
    # Optional fields for rich content
    image: Optional[str] = None  # Base64 encoded image
    document_text: Optional[str] = None  # Extracted text from uploaded documents
    message_type: MessageType = MessageType.TEXT
    
    # Structured response fields
    steps: List[MessageStep] = field(default_factory=list)
    explanation: Optional[str] = None
    
    # Metadata
    tags: List[str] = field(default_factory=list)  # For categorization
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def validate(self) -> bool:
        """Validate message domain rules"""
        # Content is required and has limits
        if not self.content or len(self.content) > 2000:
            return False
        
        # Role must be valid
        try:
            MessageRole[self.role.value.upper()]
        except (KeyError, AttributeError):
            return False
        
        # Timestamp should not be in future
        if self.timestamp > datetime.utcnow():
            return False
        
        return True

    def to_dict(self):
        """Convert to dictionary for Cosmos DB storage"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "image": self.image,
            "document_text": self.document_text,
            "message_type": self.message_type.value,
            "steps": [step.to_dict() for step in self.steps],
            "explanation": self.explanation,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

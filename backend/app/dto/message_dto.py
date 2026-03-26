"""Message Data Transfer Objects (DTOs)"""

from datetime import datetime
from typing import List, Optional
from pydantic import Field, BaseModel
from app.dto.base import BaseRequest, BaseResponse


class MessageStepDTO(BaseModel):
    """DTO for a single step in a task-list message"""
    title: str = Field(..., description="Step title")
    bullets: List[str] = Field(
        default_factory=list,
        description="Bullet points for this step"
    )
    duration: Optional[str] = Field(
        None,
        description="Estimated duration (e.g., '5 min', '10 min')"
    )


class CreateMessageDTO(BaseRequest):
    """DTO for creating a new message from user or agent"""

    role: str = Field(
        default="user",
        pattern="^(user|assistant|system)$",
        description="Message role: user, assistant, or system"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Message content"
    )
    message_type: str = Field(
        default="text",
        pattern="^(text|task-list|summary)$",
        description="Type of message: text, task-list, or summary"
    )
    image: Optional[str] = Field(
        None,
        description="Base64 encoded image"
    )
    document_text: Optional[str] = Field(
        None,
        description="Extracted text from uploaded documents"
    )
    steps: List[MessageStepDTO] = Field(
        default_factory=list,
        description="Steps for task-list messages"
    )
    explanation: Optional[str] = Field(
        None,
        description="Explanation of the response structure"
    )
    tags: List[str] = Field(
        default_factory=list,
        max_items=10,
        description="Tags for categorizing the message"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "¿Cómo aprendo sobre arquitectura limpia?",
                "message_type": "text",
                "tags": ["architecture", "learning"]
            }
        }


class MessageResponseDTO(BaseResponse):
    """DTO for message response"""

    user_id: str = Field(..., description="User ID")
    role: str = Field(..., description="Message role")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(..., description="Message timestamp")
    message_type: str = Field(..., description="Type of message")
    image: Optional[str] = Field(None, description="Base64 encoded image")
    document_text: Optional[str] = Field(None, description="Extracted doc text")
    steps: List[MessageStepDTO] = Field(default_factory=list, description="Message steps")
    explanation: Optional[str] = Field(None, description="Response explanation")
    tags: List[str] = Field(default_factory=list, description="Associated tags")

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "id": "msg-123",
                "user_id": "user-456",
                "role": "assistant",
                "content": "Arquitectura limpia separa tu código en capas...",
                "timestamp": "2024-01-01T00:00:00",
                "message_type": "task-list",
                "steps": [
                    {
                        "title": "Aprende los conceptos",
                        "bullets": ["Capas de la arquitectura", "Dependencias"],
                        "duration": "10 min"
                    }
                ],
                "explanation": "Estructuré la respuesta en pasos para reducir carga cognitiva",
                "tags": ["architecture", "backend"],
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }

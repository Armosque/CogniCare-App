"""Preference Data Transfer Objects (DTOs)"""

from typing import List, Optional
from pydantic import Field
from app.dto.base import BaseRequest, BaseResponse


class CreatePreferenceDTO(BaseRequest):
    """DTO for creating user accessibility and interaction preferences"""

    reading_level: str = Field(
        default="simple",
        pattern="^(simple|intermedio|advanced)$",
        description="Reading level: simple (basic), intermedio (general), or advanced (technical)"
    )
    tone: str = Field(
        default="motivador",
        pattern="^(motivador|directo|empatico)$",
        description="Tone: motivador (encouraging), directo (direct), or empatico (empathetic)"
    )
    high_contrast: bool = Field(
        default=False,
        description="Enable high contrast mode"
    )
    text_to_speech: bool = Field(
        default=False,
        description="Enable text-to-speech"
    )
    languages: List[str] = Field(
        default_factory=lambda: ["es"],
        min_items=1,
        max_items=5,
        description="Preferred languages (ISO 639-1 codes)"
    )
    notification_enabled: bool = Field(
        default=True,
        description="Enable notifications"
    )
    notification_frequency: str = Field(
        default="daily",
        pattern="^(daily|weekly|monthly)$",
        description="Notification frequency: daily, weekly, or monthly"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "reading_level": "simple",
                "tone": "motivador",
                "high_contrast": False,
                "text_to_speech": True,
                "languages": ["es", "en"],
                "notification_enabled": True,
                "notification_frequency": "daily"
            }
        }


class UpdatePreferenceDTO(BaseRequest):
    """DTO for updating user preferences (all fields optional)"""

    reading_level: Optional[str] = Field(
        None,
        pattern="^(simple|intermedio|advanced)$",
        description="Reading level preference"
    )
    tone: Optional[str] = Field(
        None,
        pattern="^(motivador|directo|empatico)$",
        description="Response tone preference"
    )
    high_contrast: Optional[bool] = Field(
        None,
        description="High contrast mode"
    )
    text_to_speech: Optional[bool] = Field(
        None,
        description="Text-to-speech enabled"
    )
    languages: Optional[List[str]] = Field(
        None,
        min_items=1,
        max_items=5,
        description="Preferred languages"
    )
    notification_enabled: Optional[bool] = Field(
        None,
        description="Notifications enabled"
    )
    notification_frequency: Optional[str] = Field(
        None,
        pattern="^(daily|weekly|monthly)$",
        description="Notification frequency"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "reading_level": "intermedio",
                "tone": "directo"
            }
        }


class PreferenceResponseDTO(BaseResponse):
    """DTO for preference response"""

    user_id: str = Field(..., description="User ID")
    reading_level: str = Field(..., description="Reading level preference")
    tone: str = Field(..., description="Response tone preference")
    high_contrast: bool = Field(..., description="High contrast enabled")
    text_to_speech: bool = Field(..., description="Text-to-speech enabled")
    languages: List[str] = Field(..., description="Preferred languages")
    notification_enabled: bool = Field(..., description="Notifications enabled")
    notification_frequency: str = Field(..., description="Notification frequency")

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "id": "pref-123",
                "user_id": "user-456",
                "reading_level": "simple",
                "tone": "motivador",
                "high_contrast": False,
                "text_to_speech": True,
                "languages": ["es", "en"],
                "notification_enabled": True,
                "notification_frequency": "daily",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }

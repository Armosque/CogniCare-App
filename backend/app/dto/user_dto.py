"""User Data Transfer Objects (DTOs)"""

from typing import Optional
from pydantic import Field, EmailStr
from app.dto.base import BaseRequest, BaseResponse


class CreateUserDTO(BaseRequest):
    """DTO for creating a new user"""

    email: EmailStr = Field(
        ...,
        description="User email address"
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="User full name"
    )
    bio: Optional[str] = Field(
        None,
        max_length=500,
        description="User biography"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "name": "Juan García",
                "bio": "Aprendiz de desarrollo backend"
            }
        }


class UpdateUserDTO(BaseRequest):
    """DTO for updating user profile"""

    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="User full name"
    )
    bio: Optional[str] = Field(
        None,
        max_length=500,
        description="User biography"
    )
    email: Optional[EmailStr] = Field(
        None,
        description="User email address"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "name": "Juan García",
                "bio": "Senior backend developer"
            }
        }


class UserProfileDTO(BaseResponse):
    """DTO for user profile response"""

    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User full name")
    bio: Optional[str] = Field(None, description="User biography")

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "id": "user-123",
                "email": "user@example.com",
                "name": "Juan García",
                "bio": "Aprendiz de desarrollo backend",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }


class UserStatisticsDTO(BaseResponse):
    """DTO for user statistics response"""

    user_id: str = Field(..., description="User ID")
    total_messages: int = Field(default=0, description="Total messages created")
    total_reflections: int = Field(default=0, description="Total reflection messages")
    total_questions: int = Field(default=0, description="Total question messages")
    messages_this_month: int = Field(default=0, description="Messages created this month")
    last_activity: Optional[str] = Field(
        None,
        description="Last activity timestamp"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "id": "user-stats-123",
                "user_id": "user-123",
                "total_messages": 45,
                "total_reflections": 15,
                "total_questions": 10,
                "messages_this_month": 8,
                "last_activity": "2024-01-15T14:30:00",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }

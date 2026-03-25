"""Base domain entity"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class BaseEntity(BaseModel):
    """Base entity class for all domain models"""

    id: str = Field(default_factory=lambda: str(uuid4()), description="Unique identifier")
    user_id: str = Field(..., description="User ID (partition key)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user123",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            }
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary"""
        return self.model_dump(by_alias=False)

    def update_timestamp(self) -> None:
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()

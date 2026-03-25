"""Base DTO classes"""

from datetime import datetime
from typing import Generic, List, TypeVar, Optional

from pydantic import BaseModel, Field

T = TypeVar("T")


class BaseRequest(BaseModel):
    """Base request DTO"""

    class Config:
        """Pydantic configuration"""

        from_attributes = True


class BaseResponse(BaseModel):
    """Base response DTO"""

    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration"""

        from_attributes = True


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper"""

    items: List[T]
    total: int
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    total_pages: int

    class Config:
        """Pydantic configuration"""

        from_attributes = True


class ErrorResponse(BaseModel):
    """Error response DTO"""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[dict] = Field(None, description="Additional error details")

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "details": {"field": "Invalid value"},
            }
        }

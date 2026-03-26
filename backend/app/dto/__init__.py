"""Data Transfer Objects (DTOs) - Request/Response schemas"""

from app.dto.base import (
    BaseRequest,
    BaseResponse,
    PaginatedResponse,
    ErrorResponse
)
from app.dto.message_dto import (
    CreateMessageDTO,
    MessageResponseDTO,
    MessageStepDTO
)
from app.dto.preference_dto import (
    CreatePreferenceDTO,
    UpdatePreferenceDTO,
    PreferenceResponseDTO
)
from app.dto.user_dto import (
    CreateUserDTO,
    UpdateUserDTO,
    UserProfileDTO,
    UserStatisticsDTO
)

__all__ = [
    # Base DTOs
    "BaseRequest",
    "BaseResponse",
    "PaginatedResponse",
    "ErrorResponse",
    # Message DTOs
    "CreateMessageDTO",
    "MessageResponseDTO",
    "MessageStepDTO",
    # Preference DTOs
    "CreatePreferenceDTO",
    "UpdatePreferenceDTO",
    "PreferenceResponseDTO",
    # User DTOs
    "CreateUserDTO",
    "UpdateUserDTO",
    "UserProfileDTO",
    "UserStatisticsDTO",
]

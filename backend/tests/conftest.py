"""Pytest configuration and fixtures for tests"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from app.dto.message_dto import CreateMessageDTO, MessageResponseDTO
from app.dto.preference_dto import CreatePreferenceDTO, PreferenceResponseDTO
from app.dto.user_dto import CreateUserDTO, UserProfileDTO


@pytest.fixture
def mock_message_repository():
    """Mock message repository"""
    repo = AsyncMock()
    repo.create = AsyncMock()
    repo.get = AsyncMock()
    repo.get_all = AsyncMock()
    repo.update = AsyncMock()
    repo.delete = AsyncMock()
    repo.query = AsyncMock()
    return repo


@pytest.fixture
def mock_preference_repository():
    """Mock preference repository"""
    repo = AsyncMock()
    repo.create = AsyncMock()
    repo.get = AsyncMock()
    repo.get_all = AsyncMock()
    repo.update = AsyncMock()
    repo.delete = AsyncMock()
    repo.query = AsyncMock()
    return repo


@pytest.fixture
def mock_user_repository():
    """Mock user repository"""
    repo = AsyncMock()
    repo.create = AsyncMock()
    repo.get = AsyncMock()
    repo.get_all = AsyncMock()
    repo.update = AsyncMock()
    repo.delete = AsyncMock()
    repo.query = AsyncMock()
    return repo


@pytest.fixture
def sample_message_dto():
    """Sample message DTO"""
    return CreateMessageDTO(
        user_id="test-user",
        role="user",
        content="Test message",
        message_type="text",
        image=None,
        document_text=None,
        steps=[],
        explanation=None,
        tags=["test"]
    )


@pytest.fixture
def sample_message_response():
    """Sample message response DTO"""
    return MessageResponseDTO(
        id="msg-123",
        user_id="test-user",
        role="user",
        content="Test message",
        timestamp=datetime.now(),
        message_type="text",
        image=None,
        document_text=None,
        steps=[],
        explanation=None,
        tags=["test"],
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


@pytest.fixture
def sample_preference_dto():
    """Sample preference DTO"""
    return CreatePreferenceDTO(
        user_id="test-user",
        reading_level="simple",
        tone="motivador",
        high_contrast=False,
        text_to_speech=False,
        languages=["es"],
        notification_enabled=True,
        notification_frequency="daily"
    )


@pytest.fixture
def sample_preference_response():
    """Sample preference response DTO"""
    return PreferenceResponseDTO(
        id="pref-123",
        user_id="test-user",
        reading_level="simple",
        tone="motivador",
        high_contrast=False,
        text_to_speech=False,
        languages=["es"],
        notification_enabled=True,
        notification_frequency="daily",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


@pytest.fixture
def sample_user_dto():
    """Sample user DTO"""
    return CreateUserDTO(
        email="test@example.com",
        name="Test User",
        bio="Test user bio"
    )


@pytest.fixture
def sample_user_response():
    """Sample user profile response DTO"""
    return UserProfileDTO(
        id="user-123",
        user_id="user-123",
        email="test@example.com",
        name="Test User",
        bio="Test user bio",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


@pytest.fixture
def sample_stored_message():
    """Sample stored message item from Cosmos DB"""
    return {
        "id": "msg-123",
        "user_id": "test-user",
        "role": "user",
        "content": "Test message",
        "timestamp": datetime.now().isoformat(),
        "message_type": "text",
        "image": None,
        "document_text": None,
        "steps": [],
        "explanation": None,
        "tags": ["test"],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }


@pytest.fixture
def sample_stored_preference():
    """Sample stored preference item from Cosmos DB"""
    return {
        "id": "pref-123",
        "user_id": "test-user",
        "reading_level": "simple",
        "tone": "motivador",
        "high_contrast": False,
        "text_to_speech": False,
        "languages": ["es"],
        "notification_enabled": True,
        "notification_frequency": "daily",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }


@pytest.fixture
def sample_stored_user():
    """Sample stored user item from Cosmos DB"""
    return {
        "id": "user-123",
        "email": "test@example.com",
        "name": "Test User",
        "bio": "Test user bio",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "last_activity": datetime.now().isoformat(),
        "total_messages": 0
    }

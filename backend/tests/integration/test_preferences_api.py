"""Integration tests for Preference API"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.mark.asyncio
async def test_create_preference_endpoint(client):
    """Test POST /api/preferences endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.create.return_value = {
            "id": "pref-123",
            "user_id": "test-user",
            "reading_level": "simple",
            "tone": "motivador",
            "high_contrast": False,
            "text_to_speech": False,
            "languages": ["es"],
            "notification_enabled": True,
            "notification_frequency": "daily",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.post(
            "/api/preferences?user_id=test-user",
            json={
                "user_id": "test-user",
                "reading_level": "simple",
                "tone": "motivador"
            }
        )
        
        # Assertions
        assert response.status_code == 201


@pytest.mark.asyncio
async def test_get_preference_endpoint(client):
    """Test GET /api/preferences endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = {
            "id": "pref-123",
            "user_id": "test-user",
            "reading_level": "simple",
            "tone": "motivador",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.get("/api/preferences?user_id=test-user")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["reading_level"] == "simple"


@pytest.mark.asyncio
async def test_update_preference_endpoint(client):
    """Test PUT /api/preferences endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = {
            "id": "pref-123",
            "user_id": "test-user",
            "reading_level": "simple",
            "tone": "motivador",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        mock_repo.update.return_value = {
            "id": "pref-123",
            "user_id": "test-user",
            "reading_level": "advanced",
            "tone": "motivador",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.put(
            "/api/preferences?user_id=test-user",
            json={
                "reading_level": "advanced"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["reading_level"] == "advanced"


@pytest.mark.asyncio
async def test_get_preference_not_found(client):
    """Test GET /api/preferences when preference doesn't exist"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock to return None, then create
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = None
        mock_repo.create.return_value = {
            "id": "pref-new",
            "user_id": "test-user",
            "reading_level": "simple",
            "tone": "motivador",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request (should create default preference)
        response = client.get("/api/preferences?user_id=test-user")
        
        # Assertions
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_preference_invalid_reading_level(client):
    """Test POST /api/preferences with invalid reading level"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        
        # Make request with invalid reading level
        response = client.post(
            "/api/preferences?user_id=test-user",
            json={
                "user_id": "test-user",
                "reading_level": "invalid",  # Invalid
                "tone": "motivador"
            }
        )
        
        # Assertions
        assert response.status_code in [400, 422]  # Validation error


@pytest.mark.asyncio
async def test_update_preference_partial(client):
    """Test partial preference update"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = {
            "id": "pref-123",
            "user_id": "test-user",
            "reading_level": "simple",
            "tone": "motivador",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        mock_repo.update.return_value = {
            "id": "pref-123",
            "user_id": "test-user",
            "reading_level": "simple",
            "tone": "empatico",  # Only tone changed
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request - only update tone
        response = client.put(
            "/api/preferences?user_id=test-user",
            json={
                "tone": "empatico"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["tone"] == "empatico"
        # reading_level should be preserved
        assert data["reading_level"] == "simple"

"""Integration tests for User API"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.mark.asyncio
async def test_create_user_endpoint(client):
    """Test POST /api/users endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.create.return_value = {
            "id": "user-123",
            "email": "test@example.com",
            "name": "Test User",
            "bio": "Test bio",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.post(
            "/api/users",
            json={
                "email": "test@example.com",
                "name": "Test User",
                "bio": "Test bio"
            }
        )
        
        # Assertions
        assert response.status_code == 201


@pytest.mark.asyncio
async def test_get_user_endpoint(client):
    """Test GET /api/users/{user_id} endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = {
            "id": "user-123",
            "email": "test@example.com",
            "name": "Test User",
            "bio": "Test bio",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.get("/api/users/user-123")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_user_not_found(client):
    """Test GET /api/users/{user_id} when user not found"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock to return None
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = None
        
        # Make request
        response = client.get("/api/users/nonexistent")
        
        # Assertions
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_user_endpoint(client):
    """Test PUT /api/users/{user_id} endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.update.return_value = {
            "id": "user-123",
            "email": "test@example.com",
            "name": "Updated Name",
            "bio": "Updated bio",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.put(
            "/api/users/user-123",
            json={
                "name": "Updated Name",
                "bio": "Updated bio"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_get_user_statistics_endpoint(client):
    """Test GET /api/users/{user_id}/statistics endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = {
            "id": "user-123",
            "email": "test@example.com",
            "total_messages": 5,
            "last_activity": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.get("/api/users/user-123/statistics")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["total_messages"] == 5


@pytest.mark.asyncio
async def test_create_user_invalid_email(client):
    """Test POST /api/users with invalid email"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        
        # Make request with invalid email
        response = client.post(
            "/api/users",
            json={
                "email": "invalid-email",  # Not a valid email
                "name": "Test User"
            }
        )
        
        # Assertions
        assert response.status_code in [400, 422]  # Validation error


@pytest.mark.asyncio
async def test_update_user_partial(client):
    """Test partial user update"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.update.return_value = {
            "id": "user-123",
            "email": "test@example.com",
            "name": "New Name",
            "bio": "Test bio",  # Preserved
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request - only update name
        response = client.put(
            "/api/users/user-123",
            json={
                "name": "New Name"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        # email should be preserved
        assert data["email"] == "test@example.com"

"""Integration tests for Message API"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.mark.asyncio
async def test_create_message_endpoint(client, sample_message_dto):
    """Test POST /api/messages endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.create.return_value = {
            "id": "msg-123",
            "user_id": "test-user",
            "role": "user",
            "content": "Test message",
            "timestamp": "2024-01-01T00:00:00",
            "message_type": "text",
            "tags": ["test"],
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.post(
            "/api/messages?user_id=test-user",
            json={
                "user_id": "test-user",
                "role": "user",
                "content": "Test message",
                "message_type": "text",
                "tags": ["test"]
            }
        )
        
        # Assertions
        assert response.status_code == 201


@pytest.mark.asyncio
async def test_list_messages_endpoint(client):
    """Test GET /api/messages endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_all.return_value = [
            {
                "id": "msg-123",
                "user_id": "test-user",
                "content": "Test",
                "timestamp": "2024-01-01T00:00:00",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        ]
        
        # Make request
        response = client.get("/api/messages?user_id=test-user")
        
        # Assertions
        assert response.status_code == 200
        assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_message_endpoint(client):
    """Test GET /api/messages/{message_id} endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = {
            "id": "msg-123",
            "user_id": "test-user",
            "content": "Test",
            "timestamp": "2024-01-01T00:00:00",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
        
        # Make request
        response = client.get("/api/messages/msg-123?user_id=test-user")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "msg-123"


@pytest.mark.asyncio
async def test_get_message_not_found(client):
    """Test GET /api/messages/{message_id} when not found"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock to return None
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get.return_value = None
        
        # Make request
        response = client.get("/api/messages/nonexistent?user_id=test-user")
        
        # Assertions
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_message_endpoint(client):
    """Test DELETE /api/messages/{message_id} endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.delete.return_value = True
        
        # Make request
        response = client.delete("/api/messages/msg-123?user_id=test-user")
        
        # Assertions
        assert response.status_code == 204


@pytest.mark.asyncio
async def test_search_messages_endpoint(client):
    """Test GET /api/messages/search endpoint"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        mock_repo.query.return_value = [
            {
                "id": "msg-123",
                "content": "Test search",
                "timestamp": "2024-01-01T00:00:00",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        ]
        
        # Make request
        response = client.get("/api/messages/search?user_id=test-user&query=test")
        
        # Assertions
        assert response.status_code == 200
        assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_message_validation_error(client):
    """Test POST /api/messages with invalid data"""
    with patch('app.api.dependencies.get_repository') as mock_get_repo:
        # Setup mock
        mock_repo = AsyncMock()
        mock_get_repo.return_value = mock_repo
        
        # Make request with empty content
        response = client.post(
            "/api/messages?user_id=test-user",
            json={
                "user_id": "test-user",
                "role": "user",
                "content": "",  # Empty content
                "message_type": "text"
            }
        )
        
        # Assertions
        assert response.status_code == 400  # Validation error

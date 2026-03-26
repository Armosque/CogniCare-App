"""Unit tests for MessageService"""

import pytest
from datetime import datetime
from app.service.message_service import MessageService
from app.dto.message_dto import CreateMessageDTO
from app.core.exceptions import ValidationError


@pytest.mark.asyncio
async def test_create_message_success(mock_message_repository, sample_message_dto, sample_stored_message):
    """Test successful message creation"""
    service = MessageService(mock_message_repository)
    
    # Mock repository response
    mock_message_repository.create.return_value = sample_stored_message
    
    result = await service.create_message("test-user", sample_message_dto)
    
    # Assertions
    assert result is not None
    assert result.id == "msg-123"
    assert result.user_id == "test-user"
    assert result.content == "Test message"
    
    # Verify repository was called
    mock_message_repository.create.assert_called_once()


@pytest.mark.asyncio
async def test_create_message_empty_content(mock_message_repository):
    """Test message creation with empty content fails"""
    service = MessageService(mock_message_repository)
    
    # Create DTO with empty content
    invalid_dto = CreateMessageDTO(
        user_id="test-user",
        role="user",
        content="",  # Empty content
        message_type="text"
    )
    
    with pytest.raises(ValidationError):
        await service.create_message("test-user", invalid_dto)


@pytest.mark.asyncio
async def test_get_message_success(mock_message_repository, sample_stored_message):
    """Test successful message retrieval"""
    service = MessageService(mock_message_repository)
    
    # Mock repository response
    mock_message_repository.get.return_value = sample_stored_message
    
    result = await service.get_message("test-user", "msg-123")
    
    # Assertions
    assert result is not None
    assert result.id == "msg-123"
    assert result.content == "Test message"
    
    # Verify repository was called with correct parameters
    mock_message_repository.get.assert_called_once_with("test-user", "msg-123")


@pytest.mark.asyncio
async def test_get_message_not_found(mock_message_repository):
    """Test message retrieval when message not found"""
    service = MessageService(mock_message_repository)
    
    # Mock repository returning None
    mock_message_repository.get.return_value = None
    
    result = await service.get_message("test-user", "nonexistent")
    
    # Assertions
    assert result is None


@pytest.mark.asyncio
async def test_list_messages_success(mock_message_repository, sample_stored_message):
    """Test successful message listing"""
    service = MessageService(mock_message_repository)
    
    # Mock repository response
    mock_message_repository.get_all.return_value = [sample_stored_message]
    
    result = await service.list_messages("test-user", skip=0, limit=10)
    
    # Assertions
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0].id == "msg-123"


@pytest.mark.asyncio
async def test_delete_message_success(mock_message_repository):
    """Test successful message deletion"""
    service = MessageService(mock_message_repository)
    
    # Mock repository response
    mock_message_repository.delete.return_value = True
    
    result = await service.delete_message("test-user", "msg-123")
    
    # Assertions
    assert result is True
    mock_message_repository.delete.assert_called_once_with("test-user", "msg-123")


@pytest.mark.asyncio
async def test_search_messages_by_query(mock_message_repository, sample_stored_message):
    """Test message search by query"""
    service = MessageService(mock_message_repository)
    
    # Mock repository query response
    mock_message_repository.query.return_value = [sample_stored_message]
    
    result = await service.search_messages("test-user", query="Test")
    
    # Assertions
    assert isinstance(result, list)
    assert len(result) == 1
    assert "Test" in result[0].content


@pytest.mark.asyncio
async def test_search_messages_by_tags(mock_message_repository, sample_stored_message):
    """Test message search by tags"""
    service = MessageService(mock_message_repository)
    
    # Mock repository query response
    mock_message_repository.query.return_value = [sample_stored_message]
    
    result = await service.search_messages("test-user", tags=["test"])
    
    # Assertions
    assert isinstance(result, list)
    assert len(result) == 1
    assert "test" in result[0].tags

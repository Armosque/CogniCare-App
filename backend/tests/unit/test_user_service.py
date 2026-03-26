"""Unit tests for UserService"""

import pytest
from app.service.user_service import UserService
from app.dto.user_dto import CreateUserDTO, UpdateUserDTO


@pytest.mark.asyncio
async def test_create_user_success(mock_user_repository, sample_user_dto, sample_stored_user):
    """Test successful user creation"""
    service = UserService(mock_user_repository)
    
    # Mock repository response
    mock_user_repository.create.return_value = sample_stored_user
    
    result = await service.create_user(sample_user_dto)
    
    # Assertions
    assert result is not None
    assert result.id == "user-123"
    assert result.email == "test@example.com"
    assert result.name == "Test User"


@pytest.mark.asyncio
async def test_get_user_success(mock_user_repository, sample_stored_user):
    """Test successful user retrieval"""
    service = UserService(mock_user_repository)
    
    # Mock repository response
    mock_user_repository.get.return_value = sample_stored_user
    
    result = await service.get_user("user-123")
    
    # Assertions
    assert result is not None
    assert result.id == "user-123"
    assert result.email == "test@example.com"


@pytest.mark.asyncio
async def test_get_user_not_found(mock_user_repository):
    """Test user retrieval when user not found"""
    service = UserService(mock_user_repository)
    
    # Mock repository returning None
    mock_user_repository.get.return_value = None
    
    result = await service.get_user("nonexistent")
    
    # Assertions
    assert result is None


@pytest.mark.asyncio
async def test_update_user_success(mock_user_repository, sample_stored_user):
    """Test successful user update"""
    service = UserService(mock_user_repository)
    
    # Create update DTO
    update_dto = UpdateUserDTO(
        name="Updated Name",
        bio="Updated bio"
    )
    
    # Mock repository response
    updated_user = sample_stored_user.copy()
    updated_user["name"] = "Updated Name"
    updated_user["bio"] = "Updated bio"
    mock_user_repository.update.return_value = updated_user
    
    result = await service.update_user("user-123", update_dto)
    
    # Assertions
    assert result is not None
    assert result.name == "Updated Name"
    assert result.bio == "Updated bio"


@pytest.mark.asyncio
async def test_record_activity(mock_user_repository, sample_stored_user):
    """Test recording user activity"""
    service = UserService(mock_user_repository)
    
    # Mock repository response
    updated_user = sample_stored_user.copy()
    mock_user_repository.update.return_value = updated_user
    
    await service.record_activity("user-123")
    
    # Verify update was called
    mock_user_repository.update.assert_called_once()


@pytest.mark.asyncio
async def test_increment_message_count(mock_user_repository, sample_stored_user):
    """Test incrementing user message count"""
    service = UserService(mock_user_repository)
    
    # Mock repository response
    updated_user = sample_stored_user.copy()
    updated_user["total_messages"] = 1
    mock_user_repository.update.return_value = updated_user
    
    await service.increment_message_count("user-123")
    
    # Assertions
    mock_user_repository.update.assert_called_once()


@pytest.mark.asyncio
async def test_get_statistics(mock_user_repository, sample_stored_user):
    """Test getting user statistics"""
    service = UserService(mock_user_repository)
    
    # Mock repository response
    mock_user_repository.get.return_value = sample_stored_user
    
    result = await service.get_statistics("user-123")
    
    # Assertions
    assert result is not None
    assert result.user_id == sample_stored_user["id"]
    assert result.total_messages == 0


@pytest.mark.asyncio
async def test_create_user_invalid_email(mock_user_repository):
    """Test user creation with invalid email fails validation"""
    service = UserService(mock_user_repository)
    
    # Create DTO with invalid email
    invalid_dto = CreateUserDTO(
        email="invalid-email",  # Not a valid email format
        name="Test User"
    )
    
    # Pydantic will validate the email, should raise ValidationError
    with pytest.raises(Exception):  # ValueError or ValidationError
        await service.create_user(invalid_dto)


@pytest.mark.asyncio
async def test_update_user_partial(mock_user_repository, sample_stored_user):
    """Test partial user update"""
    service = UserService(mock_user_repository)
    
    # Create update DTO with only name
    update_dto = UpdateUserDTO(
        name="New Name"
    )
    
    # Mock repository response
    updated_user = sample_stored_user.copy()
    updated_user["name"] = "New Name"
    mock_user_repository.update.return_value = updated_user
    
    result = await service.update_user("user-123", update_dto)
    
    # Assertions
    assert result is not None
    assert result.name == "New Name"
    # Check that email is preserved
    assert result.email == "test@example.com"

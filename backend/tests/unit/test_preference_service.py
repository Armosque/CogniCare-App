"""Unit tests for PreferenceService"""

import pytest
from app.service.preference_service import PreferenceService
from app.dto.preference_dto import CreatePreferenceDTO, UpdatePreferenceDTO
from app.core.exceptions import ValidationError


@pytest.mark.asyncio
async def test_create_preference_success(mock_preference_repository, sample_preference_dto, sample_stored_preference):
    """Test successful preference creation"""
    service = PreferenceService(mock_preference_repository)
    
    # Mock repository response
    mock_preference_repository.create.return_value = sample_stored_preference
    
    result = await service.create_preference("test-user", sample_preference_dto)
    
    # Assertions
    assert result is not None
    assert result.id == "pref-123"
    assert result.user_id == "test-user"
    assert result.reading_level == "simple"
    assert result.tone == "motivador"


@pytest.mark.asyncio
async def test_get_preference_success(mock_preference_repository, sample_stored_preference):
    """Test successful preference retrieval"""
    service = PreferenceService(mock_preference_repository)
    
    # Mock repository response
    mock_preference_repository.get.return_value = sample_stored_preference
    
    result = await service.get_preference("test-user")
    
    # Assertions
    assert result is not None
    assert result.id == "pref-123"
    assert result.reading_level == "simple"


@pytest.mark.asyncio
async def test_get_preference_not_found(mock_preference_repository):
    """Test preference retrieval when not found"""
    service = PreferenceService(mock_preference_repository)
    
    # Mock repository returning None
    mock_preference_repository.get.return_value = None
    
    result = await service.get_preference("test-user")
    
    # Assertions
    assert result is None


@pytest.mark.asyncio
async def test_update_preference_success(mock_preference_repository, sample_stored_preference):
    """Test successful preference update"""
    service = PreferenceService(mock_preference_repository)
    
    # Create update DTO
    update_dto = UpdatePreferenceDTO(
        reading_level="intermedio",
        tone="empatico"
    )
    
    # Mock repository response
    updated_pref = sample_stored_preference.copy()
    updated_pref["reading_level"] = "intermedio"
    updated_pref["tone"] = "empatico"
    mock_preference_repository.update.return_value = updated_pref
    
    result = await service.update_preference("test-user", update_dto)
    
    # Assertions
    assert result is not None
    assert result.reading_level == "intermedio"
    assert result.tone == "empatico"


@pytest.mark.asyncio
async def test_get_or_create_preference_exists(mock_preference_repository, sample_stored_preference):
    """Test get_or_create when preference exists"""
    service = PreferenceService(mock_preference_repository)
    
    # Mock get returning a preference
    mock_preference_repository.get.return_value = sample_stored_preference
    
    result = await service.get_or_create_preference("test-user")
    
    # Assertions
    assert result is not None
    assert result.id == "pref-123"
    # get_or_create should call get, not create
    mock_preference_repository.get.assert_called_once_with("test-user")


@pytest.mark.asyncio
async def test_get_or_create_preference_not_exists(mock_preference_repository, sample_stored_preference):
    """Test get_or_create when preference does not exist"""
    service = PreferenceService(mock_preference_repository)
    
    # Mock get returning None, then create returns new preference
    mock_preference_repository.get.return_value = None
    mock_preference_repository.create.return_value = sample_stored_preference
    
    result = await service.get_or_create_preference("test-user")
    
    # Assertions
    assert result is not None
    mock_preference_repository.create.assert_called_once()


@pytest.mark.asyncio
async def test_create_preference_invalid_reading_level(mock_preference_repository):
    """Test preference creation with invalid reading level"""
    service = PreferenceService(mock_preference_repository)
    
    # Create DTO with invalid reading level
    invalid_dto = CreatePreferenceDTO(
        user_id="test-user",
        reading_level="invalid_level",  # Invalid
        tone="motivador"
    )
    
    with pytest.raises(ValueError):
        await service.create_preference("test-user", invalid_dto)


@pytest.mark.asyncio
async def test_update_preference_partial(mock_preference_repository, sample_stored_preference):
    """Test partial preference update"""
    service = PreferenceService(mock_preference_repository)
    
    # Create update DTO with only some fields
    update_dto = UpdatePreferenceDTO(
        reading_level="advanced"
    )
    
    # Mock repository response
    updated_pref = sample_stored_preference.copy()
    updated_pref["reading_level"] = "advanced"
    mock_preference_repository.update.return_value = updated_pref
    
    result = await service.update_preference("test-user", update_dto)
    
    # Assertions
    assert result is not None
    assert result.reading_level == "advanced"
    # Check that tone is preserved from original
    assert result.tone == "motivador"

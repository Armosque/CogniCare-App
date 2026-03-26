"""Preference API routes"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from app.dto.preference_dto import (
    CreatePreferenceDTO,
    UpdatePreferenceDTO,
    PreferenceResponseDTO
)
from app.service.preference_service import PreferenceService
from app.api.dependencies import get_repository, get_current_user_id
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


async def get_preference_service() -> PreferenceService:
    """Dependency injection for PreferenceService"""
    repository = get_repository("preferences")
    return PreferenceService(repository)


@router.post("", response_model=PreferenceResponseDTO, status_code=201)
async def create_preference(
    dto: CreatePreferenceDTO = Body(...),
    user_id: str = Depends(get_current_user_id),
    service: PreferenceService = Depends(get_preference_service)
) -> PreferenceResponseDTO:
    """
    Create user preferences
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        dto: Preference data
        user_id: User ID (from token)
        
    Returns:
        Created preference
        
    Raises:
        HTTPException 400: If data is invalid
        HTTPException 401: If not authenticated
        HTTPException 500: If creation fails
    """
    try:
        logger.info(f"Creating preferences for user: {user_id}")
        return await service.create_preference(user_id, dto)
    except ValidationError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating preference: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create preference")


@router.get("", response_model=PreferenceResponseDTO)
async def get_preference(
    user_id: str = Depends(get_current_user_id),
    service: PreferenceService = Depends(get_preference_service)
) -> PreferenceResponseDTO:
    """
    Get user preferences
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        user_id: User ID (from token)
        
    Returns:
        User preferences
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If retrieval fails
    """
    try:
        logger.info(f"Fetching preferences for user: {user_id}")
        result = await service.get_or_create_preference(user_id)
        return result
    except Exception as e:
        logger.error(f"Error fetching preference: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch preference")


@router.put("", response_model=PreferenceResponseDTO)
async def update_preference(
    dto: UpdatePreferenceDTO = Body(...),
    user_id: str = Depends(get_current_user_id),
    service: PreferenceService = Depends(get_preference_service)
) -> PreferenceResponseDTO:
    """
    Update user preferences (partial update)
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        dto: Fields to update (all optional)
        user_id: User ID (from token)
        
    Returns:
        Updated preferences
        
    Raises:
        HTTPException 400: If data is invalid
        HTTPException 401: If not authenticated
        HTTPException 500: If update fails
    """
    try:
        logger.info(f"Updating preferences for user: {user_id}")
        return await service.update_preference(user_id, dto)
    except ValidationError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating preference: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update preference")

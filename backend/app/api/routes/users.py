"""User API routes"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Path, Body
from app.dto.user_dto import (
    CreateUserDTO,
    UpdateUserDTO,
    UserProfileDTO,
    UserStatisticsDTO
)
from app.service.user_service import UserService
from app.api.dependencies import get_repository, get_current_user_id
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


async def get_user_service() -> UserService:
    """Dependency injection for UserService"""
    repository = get_repository("users")
    return UserService(repository)


@router.post("", response_model=UserProfileDTO, status_code=201)
async def create_user(
    dto: CreateUserDTO = Body(...),
    user_id: str = Depends(get_current_user_id),
    service: UserService = Depends(get_user_service)
) -> UserProfileDTO:
    """
    Create user profile for current user
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        dto: User data
        user_id: Current user ID (from token)
        
    Returns:
        Created user profile
        
    Raises:
        HTTPException 400: If data is invalid
        HTTPException 401: If not authenticated
        HTTPException 500: If creation fails
    """
    try:
        logger.info(f"Creating user profile for user: {user_id}")
        # Ensure we create profile for current user only
        dto.email = dto.email or user_id  # Fallback to user_id
        return await service.create_user(user_id, dto)
    except ValidationError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")


@router.get("/{user_id}", response_model=UserProfileDTO)
async def get_user(
    user_id: str = Path(..., description="User ID to retrieve"),
    current_user_id: str = Depends(get_current_user_id),
    service: UserService = Depends(get_user_service)
) -> UserProfileDTO:
    """
    Get user profile (only own profile)
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        user_id: User ID to retrieve (must match authenticated user)
        current_user_id: Current user ID (from token)
        
    Returns:
        User profile
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 403: If trying to access another user's profile
        HTTPException 404: If user not found
        HTTPException 500: If retrieval fails
    """
    try:
        # Verify user is accessing their own profile
        if user_id != current_user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own profile"
            )
        
        logger.info(f"Fetching user profile: {user_id}")
        result = await service.get_user(user_id)
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")


@router.put("/{user_id}", response_model=UserProfileDTO)
async def update_user(
    user_id: str = Path(..., description="User ID to update"),
    dto: UpdateUserDTO = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    service: UserService = Depends(get_user_service)
) -> UserProfileDTO:
    """
    Update user profile (only own profile)
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        user_id: User ID to update (must match authenticated user)
        dto: Fields to update (all optional)
        current_user_id: Current user ID (from token)
        
    Returns:
        Updated user profile
        
    Raises:
        HTTPException 400: If data is invalid
        HTTPException 401: If not authenticated
        HTTPException 403: If trying to update another user's profile
        HTTPException 404: If user not found
        HTTPException 500: If update fails
    """
    try:
        # Verify user is updating their own profile
        if user_id != current_user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own profile"
            )
        
        logger.info(f"Updating user profile: {user_id}")
        return await service.update_user(user_id, dto)
    except ValidationError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")


@router.get("/{user_id}/statistics", response_model=UserStatisticsDTO)
async def get_user_statistics(
    user_id: str = Path(..., description="User ID"),
    current_user_id: str = Depends(get_current_user_id),
    service: UserService = Depends(get_user_service)
) -> UserStatisticsDTO:
    """
    Get user activity statistics (only own statistics)
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        user_id: User ID (must match authenticated user)
        current_user_id: Current user ID (from token)
        
    Returns:
        User statistics
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 403: If trying to access another user's statistics
        HTTPException 500: If retrieval fails
    """
    try:
        # Verify user is accessing their own statistics
        if user_id != current_user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own statistics"
            )
        
        logger.info(f"Fetching statistics for user: {user_id}")
        return await service.get_statistics(user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

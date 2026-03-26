"""
Authentication API Routes
Handles user registration, login, token refresh, and current user info
"""
from fastapi import APIRouter, HTTPException, status, Depends

from app.api.dependencies import get_current_user_id, get_user_repository
from app.dto.user_auth_dto import (
    UserRegisterRequest,
    UserLoginRequest,
    UserAutoRegisterRequest,
    RefreshTokenRequest,
    UserAuthResponse,
    CurrentUserResponse,
    TokenResponse,
)
from app.service.auth_user_service import AuthUserService
from app.core.exceptions import CogniCareException

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Route handlers
@router.post("/register", response_model=UserAuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserRegisterRequest, user_repo=Depends(get_user_repository)) -> UserAuthResponse:
    """
    Register a new user account
    
    Args:
        request: User registration data (email, name, password)
        
    Returns:
        UserAuthResponse with user data and JWT tokens
        
    Raises:
        400: If email already exists or validation fails
        500: If registration fails
    """
    try:
        auth_service = AuthUserService(user_repository=user_repo)
        result = await auth_service.register_user(request)
        return result
    except CogniCareException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/login", response_model=UserAuthResponse, status_code=status.HTTP_200_OK)
async def login(request: UserLoginRequest, user_repo=Depends(get_user_repository)) -> UserAuthResponse:
    """
    Authenticate user with email and password
    
    Args:
        request: Login credentials (email, password)
        
    Returns:
        UserAuthResponse with user data and JWT tokens
        
    Raises:
        401: If credentials are invalid
        500: If authentication fails
    """
    try:
        auth_service = AuthUserService(user_repository=user_repo)
        result = await auth_service.login_user(request)
        return result
    except CogniCareException as e:
        raise HTTPException( status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user"
        )


@router.post("/auto-register", response_model=UserAuthResponse, status_code=status.HTTP_201_CREATED)
async def auto_register(request: UserAutoRegisterRequest, user_repo=Depends(get_user_repository)) -> UserAuthResponse:
    """
    Auto-register/login user with email (for OAuth users like Azure AD)
    Creates user if doesn't exist with auto-generated password
    
    Args:
        request: Email only (password auto-generated for new users)
        
    Returns:
        UserAuthResponse with user data and JWT tokens
    """
    try:
        auth_service = AuthUserService(user_repository=user_repo)
        
        # Check if user exists
        existing_user = await user_repo.get_by_email(request.email)
        
        if existing_user:
            # User exists, generate JWT tokens for them
            access_token = auth_service.create_access_token(str(existing_user.user_id))
            refresh_token = auth_service.create_refresh_token(str(existing_user.user_id))
            
            return UserAuthResponse(
                user_id=str(existing_user.user_id),
                email=existing_user.email,
                name=existing_user.name,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=30 * 60
            )
        else:
            # User doesn't exist, create them
            import secrets
            name = request.email.split("@")[0]  # Use email prefix as name
            # Generate a cryptographically random password (max 20 chars = 20 bytes, well under bcrypt's 72-byte limit)
            auto_password = secrets.token_hex(10)  # 20 hex characters
            
            register_request = UserRegisterRequest(
                email=request.email,
                name=name,
                password=auto_password
            )
            result = await auth_service.register_user(register_request)
            return result
    except CogniCareException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to auto-register user"
        )


@router.post("/refresh", response_model=UserAuthResponse, status_code=status.HTTP_200_OK)
async def refresh_token(request: RefreshTokenRequest, user_repo=Depends(get_user_repository)) -> UserAuthResponse:
    """
    Refresh access token using refresh token
    
    Args:
        request: RefreshTokenRequest with refresh_token
        
    Returns:
        UserAuthResponse with new access token
        
    Raises:
        401: If refresh token is invalid or expired
        500: If refresh fails
    """
    try:
        auth_service = AuthUserService(user_repository=user_repo)
        result = await auth_service.refresh_access_token(request.refresh_token)
        return result
    except CogniCareException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.get("/me", response_model=CurrentUserResponse, status_code=status.HTTP_200_OK)
async def get_current_user(user_id: str = Depends(get_current_user_id), user_repo=Depends(get_user_repository)) -> CurrentUserResponse:
    """
    Get current authenticated user information
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        user_id: User ID extracted from JWT token
        
    Returns:
        CurrentUserResponse with user profile data
        
    Raises:
        401: If not authenticated or token is invalid
        404: If user not found
    """
    try:
        auth_service = AuthUserService(user_repository=user_repo)
        result = await auth_service.get_current_user(user_id)
        return result
    except CogniCareException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user_id: str = Depends(get_current_user_id)) -> None:
    """
    Logout current user
    
    Note: JWT tokens are stateless. For logout:
    - Client should delete tokens from storage
    - Token revocation can be implemented with a blacklist
    
    Requires:
        - Bearer token in Authorization header
    """
    # With JWT, logout is handled client-side by deleting tokens
    # This endpoint just validates the token is still valid
    return None

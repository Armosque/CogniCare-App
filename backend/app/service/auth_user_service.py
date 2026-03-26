"""
User Authentication Service
Handles user registration, login, and authentication operations
"""
from datetime import datetime
from typing import Optional
from loguru import logger

from app.domain.user_auth import User
from app.dto.user_auth_dto import (
    UserRegisterRequest,
    UserLoginRequest,
    UserAuthResponse,
    CurrentUserResponse,
)
from app.service.auth_service import AuthenticationService
from app.repository.user_repository import UserRepository
from app.core.exceptions import CogniCareException


class AuthUserService:
    """Service for user authentication and registration"""

    def __init__(self, user_repository: Optional[UserRepository] = None):
        """
        Initialize authentication user service
        
        Args:
            user_repository: Optional user repository (for testing)
        """
        self.auth_service = AuthenticationService()
        self.user_repository = user_repository or UserRepository()

    async def register_user(self, request: UserRegisterRequest) -> UserAuthResponse:
        """
        Register a new user
        
        Args:
            request: User registration request with email, name, and password
            
        Returns:
            UserAuthResponse with user data and tokens
            
        Raises:
            CogniCareException: If registration fails
        """
        try:
            # Log incoming request
            logger.info(f"Register attempt - email: {request.email}, name: {request.name}")
            logger.info(f"Password length (chars): {len(request.password)}, bytes: {len(request.password.encode('utf-8'))}")
            
            # Validate password length (bcrypt has 72 byte limit)
            if len(request.password.encode('utf-8')) > 72:
                logger.warning(f"Password validation failed: {len(request.password.encode('utf-8'))} bytes > 72")
                raise CogniCareException("La contraseña es demasiado larga (máximo 72 caracteres)")
            
            # Check if user already exists
            existing = await self.user_repository.get_by_email(request.email)
            if existing:
                raise CogniCareException("Email already registered")
            
            # Create user domain model
            user_id = self.auth_service.generate_user_id()
            hashed_password = self.auth_service.hash_password(request.password)
            
            user = User(
                user_id=user_id,
                email=request.email,
                name=request.name,
                hashed_password=hashed_password,
                is_active=True,
            )
            
            # Save user to database
            await self.user_repository.create_user(user)
            
            # Generate tokens
            access_token, access_expires = self.auth_service.create_access_token(
                user_id=user.user_id,
                email=user.email
            )
            refresh_token, _ = self.auth_service.create_refresh_token(user_id=user.user_id)
            
            logger.info(f"User registered: {user.email}")
            
            return UserAuthResponse(
                user_id=user.user_id,
                email=user.email,
                name=user.name,
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=int(self.auth_service.access_token_expire_minutes * 60),
            )
            
        except CogniCareException:
            raise
        except Exception as e:
            logger.error(f"Error registering user: {e}")
            raise CogniCareException("Failed to register user")

    async def login_user(self, request: UserLoginRequest) -> UserAuthResponse:
        """
        Authenticate a user
        
        Args:
            request: User login request with email and password
            
        Returns:
            UserAuthResponse with user data and tokens
            
        Raises:
            CogniCareException: If authentication fails
        """
        try:
            # Find user by email
            user = await self.user_repository.get_by_email(request.email)
            if not user:
                raise CogniCareException("Invalid email or password")
            
            # Verify password
            if not self.auth_service.verify_password(
                request.password,
                user.hashed_password
            ):
                raise CogniCareException("Invalid email or password")
            
            # Check if user is active
            if not user.is_active:
                raise CogniCareException("User account is inactive")
            
            # Generate tokens
            access_token, access_expires = self.auth_service.create_access_token(
                user_id=user.user_id,
                email=user.email
            )
            refresh_token, _ = self.auth_service.create_refresh_token(user_id=user.user_id)
            
            logger.info(f"User logged in: {user.email}")
            
            return UserAuthResponse(
                user_id=user.user_id,
                email=user.email,
                name=user.name,
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=int(self.auth_service.access_token_expire_minutes * 60),
            )
            
        except CogniCareException:
            raise
        except Exception as e:
            logger.error(f"Error logging in user: {e}")
            raise CogniCareException("Failed to authenticate user")

    async def refresh_access_token(self, refresh_token: str) -> UserAuthResponse:
        """
        Generate a new access token using refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            UserAuthResponse with new access token
            
        Raises:
            CogniCareException: If refresh token is invalid or user not found
        """
        try:
            # Verify refresh token
            payload = self.auth_service.verify_token(
                refresh_token,
                token_type="refresh"
            )
            
            user_id = payload.get("sub")
            if not user_id:
                raise CogniCareException("Invalid refresh token")
            
            # Get user to retrieve current email
            user = await self.user_repository.get_by_id(user_id)
            if not user:
                raise CogniCareException("User not found")
            
            # Generate new access token
            access_token, _ = self.auth_service.create_access_token(
                user_id=user.user_id,
                email=user.email
            )
            
            logger.info(f"Access token refreshed for user: {user_id}")
            
            return UserAuthResponse(
                user_id=user.user_id,
                email=user.email,
                name=user.name,
                access_token=access_token,
                refresh_token=refresh_token,  # Return same refresh token
                token_type="bearer",
                expires_in=int(self.auth_service.access_token_expire_minutes * 60),
            )
            
        except CogniCareException:
            raise
        except Exception as e:
            logger.error(f"Error refreshing access token: {e}")
            raise CogniCareException("Failed to refresh access token")

    async def get_current_user(self, user_id: str) -> CurrentUserResponse:
        """
        Get current logged-in user profile
        
        Args:
            user_id: User identifier from token
            
        Returns:
            CurrentUserResponse with user profile
            
        Raises:
            CogniCareException: If user not found
        """
        try:
            user = await self.user_repository.get_by_id(user_id)
            if not user:
                raise CogniCareException("User not found")
            
            return CurrentUserResponse(
                user_id=user.user_id,
                email=user.email,
                name=user.name,
                is_active=user.is_active,
            )
            
        except CogniCareException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving current user: {e}")
            raise CogniCareException("Failed to retrieve user profile")

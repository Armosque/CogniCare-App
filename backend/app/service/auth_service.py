"""
User Authentication Service
Handles user registration, login, token generation, and validation
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from loguru import logger

from app.core.config import settings
from app.domain.user_auth import User, TokenPayload
from app.core.exceptions import CogniCareException


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthenticationService:
    """Service for handling user authentication operations"""
    
    def __init__(self):
        """Initialize authentication service with JWT settings"""
        self.algorithm = "HS256"
        self.secret_key = settings.secret_key
        self.access_token_expire_minutes = settings.access_token_expire_minutes
        self.refresh_token_expire_days = settings.refresh_token_expire_days
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain text password against a hashed password
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Hashed password to check against
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def create_access_token(self, user_id: str, email: str) -> tuple[str, datetime]:
        """
        Create a JWT access token
        
        Args:
            user_id: User identifier
            email: User email address
            
        Returns:
            Tuple of (token, expiration_datetime)
            
        Raises:
            CogniCareException: If token creation fails
        """
        try:
            now = datetime.utcnow()
            expires = now + timedelta(minutes=self.access_token_expire_minutes)
            
            payload = {
                "sub": user_id,
                "email": email,
                "type": "access",
                "iat": now.timestamp(),
                "exp": expires.timestamp(),
            }
            
            encoded_jwt = jwt.encode(
                payload,
                self.secret_key,
                algorithm=self.algorithm
            )
            
            logger.debug(f"Access token created for user: {user_id}")
            return encoded_jwt, expires
            
        except Exception as e:
            logger.error(f"Error creating access token: {e}")
            raise CogniCareException("Failed to create access token")
    
    def create_refresh_token(self, user_id: str) -> tuple[str, datetime]:
        """
        Create a JWT refresh token
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (token, expiration_datetime)
            
        Raises:
            CogniCareException: If token creation fails
        """
        try:
            now = datetime.utcnow()
            expires = now + timedelta(days=self.refresh_token_expire_days)
            
            payload = {
                "sub": user_id,
                "type": "refresh",
                "iat": now.timestamp(),
                "exp": expires.timestamp(),
            }
            
            encoded_jwt = jwt.encode(
                payload,
                self.secret_key,
                algorithm=self.algorithm
            )
            
            logger.debug(f"Refresh token created for user: {user_id}")
            return encoded_jwt, expires
            
        except Exception as e:
            logger.error(f"Error creating refresh token: {e}")
            raise CogniCareException("Failed to create refresh token")
    
    def verify_token(self, token: str, token_type: str = "access") -> dict:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token to verify
            token_type: Expected token type ("access" or "refresh")
            
        Returns:
            Decoded token payload as dictionary
            
        Raises:
            CogniCareException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise CogniCareException(
                    f"Invalid token type. Expected '{token_type}'"
                )
            
            return payload
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            raise CogniCareException("Invalid or expired token")
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            raise CogniCareException("Token verification failed")
    
    def extract_user_from_token(self, token: str) -> str:
        """
        Extract user_id from access token
        
        Args:
            token: Access token
            
        Returns:
            User ID from token
            
        Raises:
            CogniCareException: If token is invalid
        """
        payload = self.verify_token(token, token_type="access")
        user_id = payload.get("sub")
        
        if not user_id:
            raise CogniCareException("Invalid token: missing user_id")
        
        return user_id
    
    def generate_user_id(self) -> str:
        """
        Generate a unique user ID
        
        Returns:
            UUID string
        """
        return str(uuid4())

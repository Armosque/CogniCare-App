"""
User Authentication Domain Models
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class User:
    """Represents an authenticated user in the system"""
    user_id: str
    email: str
    hashed_password: str = field(repr=False)  # Don't show in repr
    name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def __eq__(self, other):
        if not isinstance(other, User):
            return False
        return self.user_id == other.user_id
    
    def __hash__(self):
        return hash(self.user_id)


@dataclass
class TokenPayload:
    """JWT token payload data"""
    sub: str  # user_id (subject)
    email: str
    exp: datetime
    iat: datetime = field(default_factory=datetime.utcnow)
    type: str = "access"  # access or refresh

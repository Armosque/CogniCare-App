"""User profile domain entity"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class UserProfile:
    """Domain model for user profile information"""
    id: str
    email: str
    name: Optional[str] = None
    bio: Optional[str] = None
    
    # Account metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    # User activity tracking
    last_activity: Optional[datetime] = None
    total_messages: int = 0

    def validate(self) -> bool:
        """Validate user profile domain rules"""
        # Email is required and should be non-empty
        if not self.email or "@" not in self.email:
            return False
        
        # Name if provided should be non-empty
        if self.name is not None and len(self.name) == 0:
            return False
        
        # Bio should not exceed reasonable length
        if self.bio is not None and len(self.bio) > 500:
            return False
        
        return True

    def to_dict(self):
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "bio": self.bio,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "total_messages": self.total_messages
        }

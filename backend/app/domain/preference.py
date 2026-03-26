"""User preference domain entity"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from enum import Enum


class ReadingLevel(Enum):
    """Reading level preferences for cognitive load reduction"""
    SIMPLE = "simple"  # Basic words, short sentences, no jargon
    INTERMEDIO = "intermedio"  # General clarity, some technical terms
    ADVANCED = "advanced"  # Standard language, fluent and detailed


class Tone(Enum):
    """Response tone preferences"""
    MOTIVADOR = "motivador"  # Encouraging and supportive
    DIRECTO = "directo"  # Concise and logical
    EMPATICO = "empatico"  # Empathetic and calming


@dataclass
class UserPreference:
    """Domain model for user accessibility and interaction preferences"""
    id: str
    user_id: str
    
    # Learning and interaction preferences
    reading_level: ReadingLevel = ReadingLevel.SIMPLE
    tone: Tone = Tone.MOTIVADOR
    
    # Accessibility features
    high_contrast: bool = False  # Enable high contrast mode
    text_to_speech: bool = False  # Enable audio output
    
    # Language preferences
    languages: List[str] = field(default_factory=lambda: ["es"])  # ISO 639-1 codes
    
    # Notification preferences
    notification_enabled: bool = True
    notification_frequency: str = "daily"  # daily, weekly, monthly
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def validate(self) -> bool:
        """Validate preference domain rules"""
        # Reading level and tone must be valid
        try:
            ReadingLevel[self.reading_level.value.upper()]
            Tone[self.tone.value.upper()]
        except (KeyError, AttributeError):
            return False
        
        # At least one language
        if not self.languages or len(self.languages) == 0:
            return False
        
        # Valid notification frequency
        if self.notification_frequency not in ["daily", "weekly", "monthly"]:
            return False
        
        return True

    def to_dict(self):
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reading_level": self.reading_level.value,
            "tone": self.tone.value,
            "high_contrast": self.high_contrast,
            "text_to_speech": self.text_to_speech,
            "languages": self.languages,
            "notification_enabled": self.notification_enabled,
            "notification_frequency": self.notification_frequency,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

"""Application configuration"""

import os
from functools import lru_cache


class ConfigError(Exception):
    """Configuration error"""

    pass


class Settings:
    """Application settings loaded from environment variables"""

    def __init__(self):
        """Initialize settings and validate required variables"""
        # Azure Cosmos DB (required - must be provided via env vars)
        self.AZURE_COSMOS_ENDPOINT = os.getenv("AZURE_COSMOS_ENDPOINT")
        self.AZURE_COSMOS_KEY = os.getenv("AZURE_COSMOS_KEY")
        self.AZURE_COSMOS_DATABASE_ID = os.getenv(
            "AZURE_COSMOS_DATABASE_ID", "cognicare"
        )

        # Validate required Cosmos DB configuration
        if not self.AZURE_COSMOS_ENDPOINT:
            raise ConfigError(
                "AZURE_COSMOS_ENDPOINT environment variable is required"
            )
        if not self.AZURE_COSMOS_KEY:
            raise ConfigError("AZURE_COSMOS_KEY environment variable is required")

        # Azure AD (optional - required only if auth is enabled)
        self.AZURE_AD_CLIENT_ID = os.getenv("AZURE_AD_CLIENT_ID", "")
        self.AZURE_AD_CLIENT_SECRET = os.getenv("AZURE_AD_CLIENT_SECRET", "")
        self.AZURE_AD_TENANT_ID = os.getenv("AZURE_AD_TENANT_ID", "")

        # Azure AI Services (optional)
        self.AZURE_AI_KEY = os.getenv("AZURE_AI_KEY", "")
        self.AZURE_AI_ENDPOINT = os.getenv("AZURE_AI_ENDPOINT", "")

        # Application
        self.APP_ENV = os.getenv("BACKEND_DEBUG", "false").lower() == "true"
        self.API_VERSION = "v1"
        self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

        # Containers
        self.MESSAGES_CONTAINER = "messages"
        self.PREFERENCES_CONTAINER = "preferences"

    @property
    def is_debug(self) -> bool:
        """Check if running in debug mode"""
        return self.APP_ENV

    @property
    def cosmos_connection_string(self) -> str:
        """Get Cosmos DB connection string"""
        return f"{self.AZURE_COSMOS_ENDPOINT}"


@lru_cache()
def get_settings() -> Settings:
    """Get application settings (cached)"""
    return Settings()

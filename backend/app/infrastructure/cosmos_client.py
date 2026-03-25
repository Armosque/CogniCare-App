"""Azure Cosmos DB client (MongoDB API compatible)"""

import logging
from typing import Optional

from azure.cosmos import CosmosClient, PartitionKey

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class CosmosDBClient:
    """Cosmos DB client wrapper (MongoDB API)"""

    _instance: Optional["CosmosDBClient"] = None
    _client: Optional[CosmosClient] = None
    _db_client = None

    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self) -> None:
        """Initialize Cosmos DB connection"""
        if self._client is not None:
            logger.info("Cosmos DB already initialized")
            return

        try:
            settings = get_settings()
            logger.info(f"Connecting to Cosmos DB: {settings.AZURE_COSMOS_ENDPOINT}")

            self._client = CosmosClient(
                settings.AZURE_COSMOS_ENDPOINT, settings.AZURE_COSMOS_KEY
            )

            # Create database if not exists
            self._db_client = self._client.create_database_if_not_exists(
                id=settings.AZURE_COSMOS_DATABASE_ID
            )
            logger.info(f"Database '{settings.AZURE_COSMOS_DATABASE_ID}' initialized")

        except Exception as e:
            logger.error(f"Failed to initialize Cosmos DB: {str(e)}")
            raise

    async def close(self) -> None:
        """Close Cosmos DB connection"""
        if self._client:
            try:
                # CosmosClient.close() is synchronous, not async
                self._client.close()
                self._client = None
                logger.info("Cosmos DB connection closed")
            except Exception as e:
                logger.error(f"Error closing Cosmos DB connection: {str(e)}")

    def get_database(self):
        """Get database instance"""
        if self._db_client is None:
            raise RuntimeError("Cosmos DB not initialized. Call initialize() first.")
        return self._db_client

    async def create_container_if_not_exists(
        self, container_id: str, partition_key_path: str = "/user_id", throughput: int = 400
    ):
        """Create container if not exists"""
        try:
            logger.info(f"Creating container: {container_id}")
            container = self._db_client.create_container_if_not_exists(
                id=container_id,
                partition_key=PartitionKey(path=partition_key_path),
                offer_throughput=throughput,
            )
            logger.info(f"Container '{container_id}' ready")
            return container
        except Exception as e:
            logger.error(f"Failed to create container: {str(e)}")
            raise

    @classmethod
    def reset(cls):
        """Reset singleton (for testing)"""
        cls._instance = None
        cls._client = None

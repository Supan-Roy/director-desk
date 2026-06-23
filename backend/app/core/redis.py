import logging
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    def __init__(self):
        self.host = settings.redis_host
        self.port = settings.redis_port
        self.password = settings.redis_password or None
        self.db = settings.redis_db
        self.pool = None
        self.client = None

    async def connect(self):
        """Initialise connection pool and redis client."""
        if self.client:
            return
        
        try:
            logger.info(f"Connecting to Redis at {self.host}:{self.port}...")
            self.pool = aioredis.ConnectionPool(
                host=self.host,
                port=self.port,
                password=self.password,
                db=self.db,
                decode_responses=True
            )
            self.client = aioredis.Redis(connection_pool=self.pool)
            await self.ping()
            logger.info("Redis Connected successfully.")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self.client = None
            self.pool = None
            raise e

    async def disconnect(self):
        """Disconnect client and close connection pool."""
        if self.client:
            await self.client.aclose()
            logger.info("Redis Disconnected.")
        if self.pool:
            await self.pool.disconnect()
        self.client = None
        self.pool = None

    async def ping(self) -> bool:
        """Ping the Redis server to verify the connection is active."""
        if not self.client:
            raise ConnectionError("Redis client is not connected.")
        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis Ping failed: {e}")
            raise e

    async def get_client(self) -> aioredis.Redis:
        """Get the active Redis client, reconnecting if necessary."""
        if not self.client:
            await self.connect()
        return self.client

    async def check_health(self) -> dict:
        """Perform a connection health check and retrieve server info."""
        if not self.client:
            return {"connected": False, "error": "Not initialised"}
        try:
            await self.ping()
            info = await self.client.info()
            version = info.get("redis_version", "unknown")
            return {
                "connected": True,
                "redis_version": version
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {"connected": False, "error": str(e)}


redis_manager = RedisManager()

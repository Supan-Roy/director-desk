from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = 'Director Desk'
    app_env: str = 'development'
    app_host: str = '0.0.0.0'
    app_port: int = 8000
    cors_origins: list[str] = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
    qwen_api_base_url: str = ''
    qwen_api_key: str = ''
    
    redis_host: str = 'localhost'
    redis_port: int = 6379
    redis_password: str = ''
    redis_db: int = 0

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(',') if origin.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

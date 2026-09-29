from pathlib import Path
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "National Weather Big Data Analytics Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        """Accept deployment labels injected by common hosting environments.

        A hosting environment currently supplies ``DEBUG=release``. Pydantic's
        boolean parser rejects that string before the app or Alembic can start.
        Production/release labels deliberately map to ``False``; conventional
        true/false values keep Pydantic's standard parsing behavior.
        """
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev"}:
                return True
        return value

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/weather_platform"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/weather_platform"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v):
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)

            if "?" in v:
                from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
                parsed = urlparse(v)
                query_params = parse_qsl(parsed.query, keep_blank_values=True)
                new_params = []
                for key, val in query_params:
                    if key in ("channel_binding", "gssencmode", "target_session_attrs"):
                        continue
                    if key == "sslmode":
                        if val in ("require", "verify-full", "verify-ca", "prefer", "allow"):
                            new_params.append(("ssl", "require"))
                        continue
                    new_params.append((key, val))
                new_query = urlencode(new_params)
                v = urlunparse((
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    parsed.params,
                    new_query,
                    parsed.fragment
                ))
        return v

    @field_validator("DATABASE_URL_SYNC", mode="before")
    @classmethod
    def assemble_db_url_sync(cls, v):
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql://", 1)
            if "ssl=" in v and "sslmode=" not in v:
                import re
                v = re.sub(r"([?&])ssl=[^&]+", r"\1sslmode=require", v)
        return v

    # JWT
    JWT_SECRET_KEY: str = "super-secret-change-in-production-weather-platform-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # External APIs
    OPENWEATHER_API_KEY: str = ""
    TWITTER_BEARER_TOKEN: str = ""
    APIFY_API_TOKEN: str = ""
    APIFY_X_ACTOR_ID: str = "data-slayer~twitter-search"

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # ML
    FAKE_DETECTION_THRESHOLD: float = 0.7
    DUPLICATE_DISTANCE_KM: float = 10.0
    DUPLICATE_TIME_WINDOW_HOURS: int = 6

    # The compiled React application. It is present in the single-container image.
    FRONTEND_DIST_DIR: Path = Path(__file__).resolve().parents[3] / "frontend" / "dist"


settings = Settings()

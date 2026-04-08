import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Maptive - Network Digital Twin"
    # Default to SQLite for local development; switch to PostgreSQL for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./maptive.db")
    UPLOAD_DIR: str = "uploads"
    FIREBASE_SERVICE_ACCOUNT: str = os.getenv("FIREBASE_SERVICE_ACCOUNT", "firebase-sdk.json")
    
    # Mock roles for demonstration if Firebase isn't fully linked yet
    DEFAULT_ROLE: str = "standard"

    class Config:
        env_file = ".env"

settings = Settings()

# Ensure upload directory exists
if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

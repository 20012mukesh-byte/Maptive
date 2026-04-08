import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Maptive - Network Digital Twin"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/maptive")
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

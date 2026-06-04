import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the base directory of the backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOTENV_PATH = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    # App configs
    APP_NAME: str = "Email Intelligence Agent"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # AI Pipeline Engine Mode ("PRODUCTION" or "FALLBACK")
    AI_MODE: str = "FALLBACK"
    
    # AWS Settings (Leave blank or empty to automatically fallback to local JSON database file)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-east-1"
    DYNAMODB_ENDPOINT_URL: Optional[str] = None
    
    EMAILS_TABLE_NAME: str = "emails"
    TASKS_TABLE_NAME: str = "tasks"
    ANALYTICS_TABLE_NAME: str = "analytics"
    
    # IMAP Configuration
    IMAP_SERVER: str = "outlook.office365.com"
    IMAP_PORT: int = 993
    IMAP_EMAIL: Optional[str] = None
    IMAP_PASSWORD: Optional[str] = None
    
    # Demo Configuration
    DEMO_MODE: bool = True
    
    # Enable reading from .env file
    model_config = SettingsConfigDict(
        env_file=DOTENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def use_mock_db(self) -> bool:
        """
        Determines whether to fall back to a local JSON file-based database.
        If AWS credentials are missing and we are not using a local DynamoDB emulator,
        we use the local mock JSON database.
        """
        if self.DYNAMODB_ENDPOINT_URL:
            # If a local emulator URL is provided, we use DynamoDB
            return False
        return not (self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY)

    @property
    def use_mock_imap(self) -> bool:
        """
        Determines whether to use synthetic mock email fetching.
        """
        if self.DEMO_MODE:
            return True
        return not (self.IMAP_EMAIL and self.IMAP_PASSWORD)

# Instantiate settings singleton
settings = Settings()

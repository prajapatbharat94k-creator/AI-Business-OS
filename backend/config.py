import os
from dotenv import load_dotenv

load_dotenv()

# General Config
API_V1_STR = "/api/v1"
PROJECT_NAME = "AI Business OS Backend"

# Security & Auth
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

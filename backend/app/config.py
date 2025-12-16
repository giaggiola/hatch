from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/hatch.db"
    google_client_id: str = ""
    google_client_secret: str = ""
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # Email Configuration (Gmail SMTP)
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    mail_starttls: bool = True
    mail_ssl_tls: bool = False

    # Admin emails (comma-separated)
    admin_emails: str = ""

    @property
    def admin_email_list(self) -> list[str]:
        """Parse admin emails from comma-separated string."""
        if not self.admin_emails:
            return []
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()

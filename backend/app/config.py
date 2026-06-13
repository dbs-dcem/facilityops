from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://facilityops:facilityops@db:5432/facilityops"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Device sync auth (simple API key for Phase 1; replace with JWT in Phase 2)
    device_api_key: str = "facilityops-dev-key"

    # Email alerts — all must be set to enable
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    alert_email_to: str = ""  # comma-separated list

    # ServiceNow — servicenow_instance must be set to enable
    servicenow_instance: str = ""  # e.g. "acme.service-now.com"
    servicenow_username: str = ""
    servicenow_password: str = ""
    servicenow_assignment_group: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

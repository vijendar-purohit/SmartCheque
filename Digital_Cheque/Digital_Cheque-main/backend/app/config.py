from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database
    database_url: str = Field(default="postgresql://smartcheque:smartcheque123@localhost:5432/smartcheque")
    
    # Redis
    redis_url: str = Field(alias="REDIS_URL", default="redis://redis:6379/0")
    
    # Kafka
    kafka_bootstrap_servers: str = Field(alias="KAFKA_BOOTSTRAP_SERVERS", default="kafka:9092")
    
    # MinIO
    minio_endpoint: str = Field(alias="MINIO_ENDPOINT", default="minio:9000")
    minio_public_endpoint: str = Field(alias="MINIO_PUBLIC_ENDPOINT", default="localhost:9000")
    minio_access_key: str = Field(alias="MINIO_ACCESS_KEY", default="admin")
    minio_secret_key: str = Field(alias="MINIO_SECRET_KEY", default="admin123")
    minio_bucket: str = "cheques"
    
    # OpenSearch
    opensearch_host: str = Field(alias="OPENSEARCH_HOST", default="opensearch")
    opensearch_port: int = Field(alias="OPENSEARCH_PORT", default=9200)
    
    # Security
    secret_key: str = Field(alias="SECRET_KEY", default="dev-secret-key-change-me")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    
    # SendGrid
    sendgrid_api_key: str = Field(alias="SENDGRID_API_KEY", default="")
    from_email: str = Field(alias="FROM_EMAIL", default="noreply@smartcheque.local")
    
    # WebAuthn
    webauthn_rp_id: str = Field(alias="WEBAUTHN_RP_ID", default="localhost")
    webauthn_rp_name: str = Field(alias="WEBAUTHN_RP_NAME", default="SmartCheque")
    webauthn_origin: str = Field(alias="WEBAUTHN_ORIGIN", default="http://localhost:8000")

    # Environment
    environment: str = Field(alias="ENVIRONMENT", default="development")

    # RSA Keys for Bank
    bank_rsa_private_key: str = Field(alias="BANK_RSA_PRIVATE_KEY", default="")
    bank_rsa_public_key: str = Field(alias="BANK_RSA_PUBLIC_KEY", default="")
    bank_rsa_private_key_path: str = Field(alias="BANK_RSA_PRIVATE_KEY_PATH", default="")
    bank_rsa_public_key_path: str = Field(alias="BANK_RSA_PUBLIC_KEY_PATH", default="")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
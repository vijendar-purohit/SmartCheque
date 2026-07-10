import uuid
from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile = Column(String(15), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum("INDIVIDUAL", "CORPORATE", "BANK_OFFICER", name="user_role"), nullable=False, default="INDIVIDUAL")
    wallet_paise = Column(BigInteger, nullable=False, default=100000000)  # ₹10,00,000
    kyc_status = Column(Enum("PENDING", "VERIFIED", name="kyc_status"), nullable=False, default="PENDING")
    webauthn_credential = Column(JSONB, nullable=True)
    totp_secret = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    accounts = relationship("Account", back_populates="user")
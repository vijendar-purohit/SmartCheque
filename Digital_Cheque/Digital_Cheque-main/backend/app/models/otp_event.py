import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class OtpEvent(Base):
    __tablename__ = "otp_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cheque_id = Column(UUID(as_uuid=True), ForeignKey("cheques.id"), nullable=False)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    otp_code = Column(String(6), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    response_type = Column(Enum("APPROVE", "REJECT", "TIMEOUT", name="otp_response"), nullable=True)
    attempt_count = Column(Integer, nullable=False, default=0)

    cheque = relationship("Cheque", back_populates="otp_events")
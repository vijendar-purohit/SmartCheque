import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ChequeSignature(Base):
    __tablename__ = "cheque_signatures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cheque_id = Column(UUID(as_uuid=True), ForeignKey("cheques.id"), nullable=False)
    signer_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    signature_hex = Column(String, nullable=False)
    signed_at = Column(DateTime(timezone=True), server_default=func.now())
    webauthn_used = Column(Boolean, nullable=False, default=False)
    biometric_confirmed = Column(Boolean, nullable=False, default=False)

    # Relationships
    cheque = relationship("Cheque", back_populates="signatures")
    signer_account = relationship("Account", foreign_keys=[signer_account_id], back_populates="cheque_signatures")
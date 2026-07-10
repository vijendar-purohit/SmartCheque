import uuid
from sqlalchemy import Column, String, Integer, BigInteger, ForeignKey, DateTime, Date, Boolean, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class Cheque(Base):
    __tablename__ = "cheques"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leaf_id = Column(UUID(as_uuid=True), ForeignKey("cheque_leaves.id"), unique=True, nullable=False)
    leaf_serial = Column(String(30), nullable=False, index=True)
    drawer_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    
    # Payee details
    payee_account_number = Column(String(18), nullable=False)
    payee_name = Column(String(100), nullable=False)
    ifsc_code = Column(String(11), nullable=False)
    
    # Amount (stored as paise integer)
    amount_paise = Column(BigInteger, nullable=False)
    
    # Cryptographic fields
    cheque_hash = Column(String(64), unique=True, nullable=False, index=True)
    qr_a_payload = Column(JSONB, nullable=False)  # SHA-256 hash
    qr_b_payload = Column(JSONB, nullable=False)  # ECDSA signature
    qr_c_payload = Column(JSONB, nullable=False)  # Encrypted payload
    
    # Status
    status = Column(
        Enum(
            "ISSUED", "PENDING_COSIGN", "PRESENTED", "OTP_PENDING",
            "OTP_APPROVED", "CLEARED", "REJECTED", "CANCELLED", "EXPIRED",
            name="cheque_status"
        ),
        nullable=False,
        default="ISSUED"
    )
    
    # Multi-signature
    multi_sig_required = Column(Boolean, nullable=False, default=False)
    cosigner_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    
    # Timestamps
    issue_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    expiry_date = Column(Date, nullable=False)  # issue_date + 90 days
    
    # File storage
    png_s3_key = Column(String, nullable=True)
    pdf_s3_key = Column(String, nullable=True)
    
    # Version
    version = Column(String(10), nullable=False, default="v1.0")

    # Relationships
    leaf = relationship("ChequeLeaf", back_populates="cheque", uselist=False)
    drawer_account = relationship("Account", foreign_keys=[drawer_account_id])
    cosigner_account = relationship("Account", foreign_keys=[cosigner_account_id])
    signatures = relationship("ChequeSignature", back_populates="cheque", cascade="all, delete-orphan")
    otp_events = relationship("OtpEvent", back_populates="cheque", cascade="all, delete-orphan")
    transaction = relationship("Transaction", back_populates="cheque", uselist=False)
    risk_score = relationship("RiskScore", back_populates="cheque", uselist=False)
import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, BigInteger, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cheque_id = Column(UUID(as_uuid=True), ForeignKey("cheques.id"), nullable=False)
    drawer_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    payee_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    status = Column(Enum("SETTLED", "FAILED", name="transaction_status"), nullable=False, default="SETTLED")
    settled_at = Column(DateTime(timezone=True), server_default=func.now())

    cheque = relationship("Cheque", back_populates="transaction")
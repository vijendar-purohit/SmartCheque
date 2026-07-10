import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ChequeLeaf(Base):
    __tablename__ = "cheque_leaves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leaf_serial = Column(String(30), unique=True, nullable=False, index=True)
    book_id = Column(UUID(as_uuid=True), ForeignKey("cheque_books.id"), nullable=False)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    leaf_sequence = Column(Integer, nullable=False)
    status = Column(
        Enum("ISSUED", "ACTIVE", "USED", "CANCELLED", "EXPIRED", name="leaf_status"),
        nullable=False,
        default="ISSUED"
    )
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    cleared_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    cheque_book = relationship("ChequeBook", back_populates="leaves")
    account = relationship("Account", back_populates="cheque_leaves")
    cheque = relationship("Cheque", back_populates="leaf", uselist=False)

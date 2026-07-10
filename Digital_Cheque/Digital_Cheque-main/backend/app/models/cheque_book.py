import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ChequeBook(Base):
    __tablename__ = "cheque_books"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    book_sequence = Column(Integer, nullable=False)  # 0001, 0002, etc.
    total_leaves = Column(Integer, nullable=False, default=50)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account = relationship("Account", back_populates="cheque_books")
    leaves = relationship("ChequeLeaf", back_populates="cheque_book")
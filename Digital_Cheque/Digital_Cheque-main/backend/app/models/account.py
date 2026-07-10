import uuid
from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    account_number = Column(String(12), unique=True, nullable=False, index=True)
    ifsc = Column(String(11), nullable=False, default="SMTC0000001")
    balance_paise = Column(BigInteger, nullable=False, default=100000000)  # ₹10,00,000

    # Relationships
    user = relationship("User", back_populates="accounts")
    cheque_books = relationship("ChequeBook", back_populates="account", cascade="all, delete-orphan")
    cheque_leaves = relationship("ChequeLeaf", back_populates="account")
    drawer_cheques = relationship("Cheque", foreign_keys="Cheque.drawer_account_id", back_populates="drawer_account")
    cosigner_cheques = relationship("Cheque", foreign_keys="Cheque.cosigner_account_id", back_populates="cosigner_account")
    cheque_signatures = relationship("ChequeSignature", foreign_keys="ChequeSignature.signer_account_id", back_populates="signer_account")

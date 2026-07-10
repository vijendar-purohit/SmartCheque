import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, Boolean, DECIMAL, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cheque_id = Column(UUID(as_uuid=True), ForeignKey("cheques.id"), unique=True, nullable=False)
    risk_score = Column(Integer, nullable=False)
    fraud_probability = Column(DECIMAL(6, 4), nullable=True)
    anomaly_score = Column(DECIMAL(6, 4), nullable=True)
    lstm_error = Column(DECIMAL(6, 4), nullable=True)
    routing_decision = Column(String(20), nullable=False)
    shap_explanation = Column(JSON, nullable=True)
    is_placeholder = Column(Boolean, nullable=False, default=False)
    scored_at = Column(DateTime(timezone=True), server_default=func.now())

    cheque = relationship("Cheque", back_populates="risk_score")
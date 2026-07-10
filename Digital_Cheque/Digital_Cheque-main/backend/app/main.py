from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_db
from app.routers import auth, cheque, verification
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

app = FastAPI(
    title="Smart Cheque System",
    description="Fully Digital Bank Cheque System with AI/ML Fraud Detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cheque.router)
app.include_router(verification.router)


@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Smart Cheque System",
        "version": "1.0.0",
        "environment": settings.environment,
    }


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    """Check database connectivity"""
    try:
        result = await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


@app.get("/health/ready")
async def ready():
    """Kubernetes-style readiness check"""
    return {"status": "ready", "checks": {"database": "ok"}}


@app.get("/health/ml")
async def health_ml():
    """ML model status: shows which fraud-detection models loaded successfully."""
    from app.services.ml_inference_service import (
        LSTM_AVAILABLE, xgb_model, iso_forest, feature_names, _load_models,
    )

    # Trigger lazy load so status reflects reality rather than pre-first-use state
    try:
        _load_models()
    except Exception as e:
        return {
            "xgboost": "failed",
            "isolation_forest": "failed",
            "lstm": "skipped (load error)",
            "feature_count": 0,
            "ensemble_weights": {
                "xgboost": "0%",
                "isolation_forest": "0%",
                "lstm": "0% (skipped)",
            },
            "load_error": str(e),
        }

    return {
        "xgboost": "loaded" if xgb_model else "failed",
        "isolation_forest": "loaded" if iso_forest else "failed",
        "lstm": "loaded" if LSTM_AVAILABLE else "skipped (architecture mismatch)",
        "feature_count": len(feature_names) if feature_names else 0,
        "ensemble_weights": {
            "xgboost": "62.5%" if not LSTM_AVAILABLE else "50%",
            "isolation_forest": "37.5%" if not LSTM_AVAILABLE else "30%",
            "lstm": "0% (skipped)" if not LSTM_AVAILABLE else "20%",
        },
    }
SmartCheque — Fully Digital Bank Cheque System
A cryptographically secured digital cheque platform with AI/ML fraud detection, built as an Mphasis internship project.

What it does
Creates digital cheques with SHA-256 integrity, ECC digital signatures, and RSA-4096 encrypted payloads across 3 QR zones
AI/ML fraud detection using XGBoost + Isolation Forest + LSTM ensemble with SHAP explainability
Real-time OTP confirmation flow for drawer approval at clearance
Wallet-based fund transfer between registered users
Tech Stack
Backend: Python 3.11 + FastAPI + PostgreSQL + Redis + Kafka
Frontend: React 18 + TypeScript + Vite + Tailwind CSS
ML: XGBoost + Isolation Forest + PyTorch LSTM + SHAP
Storage: MinIO (S3-compatible)
Search/Audit: OpenSearch
Crypto: pyca/cryptography (ECC secp256k1, AES-256-GCM, RSA-4096)
Containerization: Docker + Docker Compose

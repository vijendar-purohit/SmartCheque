# SmartCheque — Fully Digital Bank Cheque System

A cryptographically secured digital cheque platform with AI/ML fraud 
detection, built as an Mphasis internship project.

## What it does
- Creates digital cheques with SHA-256 integrity, ECC digital signatures,
  and RSA-4096 encrypted payloads across 3 QR zones
- AI/ML fraud detection using XGBoost + Isolation Forest + LSTM ensemble
  with SHAP explainability
- Real-time OTP confirmation flow for drawer approval at clearance
- Wallet-based fund transfer between registered users

## Tech Stack
- Backend: Python 3.11 + FastAPI + PostgreSQL + Redis + Kafka
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- ML: XGBoost + Isolation Forest + PyTorch LSTM + SHAP
- Storage: MinIO (S3-compatible)
- Search/Audit: OpenSearch
- Crypto: pyca/cryptography (ECC secp256k1, AES-256-GCM, RSA-4096)
- Containerization: Docker + Docker Compose

## Quick Start

Prerequisites: Docker Desktop, Node.js 18+

1. Clone and configure:
   cp .env.example .env
   # Edit .env with your values

2. Generate RSA keys (one-time):
   docker-compose run --rm backend python -c "
   from app.services.key_manager import generate_and_print_rsa_keypair
   generate_and_print_rsa_keypair()
   "
   # Copy output into .env as BANK_RSA_PRIVATE_KEY and BANK_RSA_PUBLIC_KEY

3. Start all services:
   docker-compose up -d

4. Run database migrations:
   docker exec -it smartcheque_backend alembic upgrade head

5. Start frontend:
   cd frontend
   npm install
   npm run dev

6. Access:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - ML Status: http://localhost:8000/health/ml
   - MinIO Console: http://localhost:9001

## Running Tests

# Crypto unit tests (7 tests)
docker exec -it smartcheque_backend python -m pytest tests/test_crypto.py -v

# Full pipeline integration tests (13 tests)
docker exec -it smartcheque_backend python tests/test_full_pipeline.py

## Key Features

### Smart Square Cheque Format
- 40% left zone: QR-A (SHA-256 hash), QR-B (ECDSA signature), 
  QR-C (encrypted payload), vertical barcode, MICR line
- 60% right zone: payee details, expanded amount boxes 
  (Crores/Lakhs/.../Paise), metadata, drawer signature area

### Cryptographic Pipeline
1. canonical_serialize() — deterministic field ordering
2. SHA-256 hash → QR-A
3. ECDSA secp256k1 sign → QR-B  
4. zlib compress → AES-256-GCM encrypt → RSA-4096 OAEP → QR-C
5. Cross-reference checksums link all 3 QRs

### AI Risk Scoring
- XGBoost (50%) + Isolation Forest (30%) + LSTM (20%) ensemble
- SHAP TreeExplainer for feature contribution explanation
- Routing: score 0-30 AUTO_CLEAR, 31-70 OTP_REQUIRED, 71-100 OTP_PLUS_REVIEW
- Trained on ULB Credit Card Fraud dataset + synthetic cheque features

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register with auto wallet Rs.10,00,000 |
| POST | /auth/login | Login, returns JWT |
| GET | /auth/me | Profile + balance |
| POST | /cheques/create | Create digital cheque |
| POST | /cheques/{id}/present | Payee presents cheque |
| POST | /cheques/{id}/otp/respond | Drawer approve/reject |
| GET | /cheques/{id}/risk-details | SHAP explanation |
| GET | /health/ml | ML model status |
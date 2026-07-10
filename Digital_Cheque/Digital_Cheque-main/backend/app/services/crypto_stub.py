"""Stub module for cryptographic operations used by the SmartCheque pipeline.

This file mirrors the public surface of `crypto.py` so teammates can see
the function signatures, docstrings, and intended behavior without
having the actual implementation checked in. Every function raises
`NotImplementedError`; the real logic lives in `crypto.py`.
"""


def canonical_serialize(fields: dict) -> bytes:
    """
    Sorts fields alphabetically, normalizes values,
    concatenates with pipe delimiter, returns UTF-8 bytes.
    """
    raise NotImplementedError("Implementation not included in this repo")


def generate_sha256_hash(canonical_bytes: bytes) -> str:
    """Returns 64-character SHA-256 hex string."""
    raise NotImplementedError


def generate_ecc_keypair() -> tuple:
    """Returns (private_key_pem, public_key_pem) using secp256k1."""
    raise NotImplementedError


def sign_with_ecc(private_key_pem: str, hash_hex: str) -> str:
    """ECDSA sign, returns signature hex."""
    raise NotImplementedError


def verify_ecc_signature(public_key_pem: str, hash_hex: str,
                         signature_hex: str) -> bool:
    """Verify ECDSA signature."""
    raise NotImplementedError


def encrypt_payload_qrc(payload: dict,
                        rsa_public_key_pem: str) -> dict:
    """
    Pipeline: JSON → zlib compress → AES-256-GCM encrypt →
    RSA-4096 OAEP encrypt session key.
    Returns dict with enc_payload, iv, tag, enc_key (base64).
    """
    raise NotImplementedError


def decrypt_payload_qrc(qrc_data: dict,
                        rsa_private_key_pem: str) -> dict:
    """Reverse of encrypt_payload_qrc."""
    raise NotImplementedError


def compute_cross_reference_checksums(qra: dict, qrb: dict,
                                      qrc: dict) -> tuple:
    """
    Links all 3 QR zones cryptographically.
    Fills crc_bc in QR-A, crc_ac in QR-B, crc_ab in QR-C.
    """
    raise NotImplementedError


def verify_cross_reference_checksums(qra: dict, qrb: dict,
                                     qrc: dict) -> bool:
    """Verifies all 3 cross-reference checksums."""
    raise NotImplementedError

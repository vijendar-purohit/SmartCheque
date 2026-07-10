import pytest
import json
from app.services import crypto
from app.services.key_manager import generate_rsa_keypair


class TestCryptoService:
    
    def test_canonical_serialize(self):
        fields = {
            "amount": 50000,
            "payee": "Rahul Kumar",
            "ifsc": "SBIN0012345"
        }
        result = crypto.canonical_serialize(fields)
        # Check it's bytes
        assert isinstance(result, bytes)
        # Check fields are sorted alphabetically
        decoded = result.decode('utf-8')
        assert decoded.startswith("AMOUNT:000000000050000|IFSC:SBIN0012345|PAYEE:RAHUL KUMAR")
    
    def test_generate_sha256_hash(self):
        canonical_bytes = b"AMOUNT:000000000050000|PAYEE:TEST"
        hash_result = crypto.generate_sha256_hash(canonical_bytes)
        assert isinstance(hash_result, str)
        assert len(hash_result) == 64
        assert all(c in "0123456789abcdef" for c in hash_result.lower())
    
    def test_ecc_keypair_generation(self):
        private, public = crypto.generate_ecc_keypair()
        assert isinstance(private, str)
        assert isinstance(public, str)
        assert "BEGIN PRIVATE KEY" in private
        assert "BEGIN PUBLIC KEY" in public
    
    def test_ecc_sign_and_verify(self):
        # Generate keypair
        private, public = crypto.generate_ecc_keypair()
        
        # Hash
        canonical = b"AMOUNT:000000000050000|PAYEE:TEST"
        hash_hex = crypto.generate_sha256_hash(canonical)
        
        # Sign
        signature = crypto.sign_with_ecc(private, hash_hex)
        assert isinstance(signature, str)
        assert len(signature) > 0
        
        # Verify
        result = crypto.verify_ecc_signature(public, hash_hex, signature)
        assert result is True
        
        # Tampered hash should fail
        tampered_hash = "a" * 64
        result = crypto.verify_ecc_signature(public, tampered_hash, signature)
        assert result is False
    
    def test_rsa_encrypt_decrypt_qrc(self):
        # Generate RSA keypair
        private_pem, public_pem = generate_rsa_keypair()
        
        # Test payload
        payload = {
            "account": "123456789012",
            "amount": 5000000,
            "payee": "RAHUL KUMAR"
        }
        
        # Encrypt
        encrypted = crypto.encrypt_payload_qrc(payload, public_pem)
        assert "enc_payload" in encrypted
        assert "iv" in encrypted
        assert "tag" in encrypted
        assert "enc_key" in encrypted
        
        # Decrypt
        decrypted = crypto.decrypt_payload_qrc(encrypted, private_pem)
        assert decrypted["account"] == payload["account"]
        assert decrypted["amount"] == payload["amount"]
        assert decrypted["payee"] == payload["payee"]
    
    def test_cross_reference_checksums(self):
        qra = {"hash": "abc123", "crc_bc": None}
        qrb = {"signature": "def456", "crc_ac": None}
        qrc = {"payload": "ghi789", "crc_ab": None}
        
        # Compute
        final_qra, final_qrb, final_qrc = crypto.compute_cross_reference_checksums(qra, qrb, qrc)
        
        # Check CRCs are filled
        assert final_qra["crc_bc"] is not None
        assert final_qrb["crc_ac"] is not None
        assert final_qrc["crc_ab"] is not None
        
        # Verify
        result = crypto.verify_cross_reference_checksums(final_qra, final_qrb, final_qrc)
        assert result is True
        
        # Tamper with one QR
        final_qra["hash"] = "tampered"
        result = crypto.verify_cross_reference_checksums(final_qra, final_qrb, final_qrc)
        assert result is False
    
    def test_canonical_serialize_deterministic(self):
        fields1 = {"b": 2, "a": 1, "c": 3}
        fields2 = {"a": 1, "c": 3, "b": 2}
        result1 = crypto.canonical_serialize(fields1)
        result2 = crypto.canonical_serialize(fields2)
        assert result1 == result2
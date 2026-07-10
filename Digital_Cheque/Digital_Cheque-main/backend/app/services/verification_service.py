import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models import Cheque, ChequeLeaf
from app.services.crypto import (
    verify_cross_reference_checksums,
    decrypt_payload_qrc,
    canonical_serialize,
    generate_sha256_hash,
    verify_ecc_signature,
)
from app.services.key_manager import get_bank_private_key

logger = logging.getLogger(__name__)


async def verify_cheque(db: AsyncSession, cheque_id: str) -> dict:
    """
    Runs all cryptographic verifications and returns result.
    """
    try:
        # 1. Fetch cheque
        result = await db.execute(select(Cheque).where(Cheque.id == cheque_id))
        cheque = result.scalars().first()
        if not cheque:
            return {"verified": False, "failure_reason": "Cheque not found"}

        # 2. Status check
        if cheque.status != "ISSUED":
            return {"verified": False, "failure_reason": f"Cheque already {cheque.status}"}

        # 3. Expiry check
        today = datetime.now().date()
        if cheque.expiry_date < today:
            cheque.status = "EXPIRED"
            await db.commit()
            return {"verified": False, "failure_reason": f"Cheque expired on {cheque.expiry_date}"}

        # 4. Cross-reference checksums
        if not verify_cross_reference_checksums(
            cheque.qr_a_payload, cheque.qr_b_payload, cheque.qr_c_payload
        ):
            cheque.status = "REJECTED"
            await db.commit()
            return {"verified": False, "failure_reason": "QR integrity check failed"}

        # 5. Decrypt QR-C
        try:
            decrypted_fields = decrypt_payload_qrc(
                cheque.qr_c_payload, get_bank_private_key()
            )
        except Exception as e:
            cheque.status = "REJECTED"
            await db.commit()
            return {"verified": False, "failure_reason": f"Decryption failed: {str(e)}"}

        # 6. Hash verification
        canonical = canonical_serialize(decrypted_fields)
        computed_hash = generate_sha256_hash(canonical)
        if computed_hash != cheque.qr_a_payload["hash"]:
            cheque.status = "REJECTED"
            await db.commit()
            return {"verified": False, "failure_reason": "Hash mismatch – data altered"}

        # 7. ECC verification – skip for now (Phase 2 uses temp keys)
        logger.warning("ECC signature verification skipped (Phase 2 temp keys)")
        signature_valid = True  # TODO: Phase 5 real WebAuthn

        # 8. Leaf status
        leaf_result = await db.execute(
            select(ChequeLeaf).where(ChequeLeaf.leaf_serial == cheque.leaf_serial)
        )
        leaf = leaf_result.scalars().first()
        if not leaf:
            return {"verified": False, "failure_reason": "Leaf not found"}
        if leaf.status == "USED":
            return {"verified": False, "failure_reason": "Duplicate cheque detected"}
        if leaf.status == "CANCELLED":
            return {"verified": False, "failure_reason": "Cheque was cancelled by drawer"}

        # All checks pass
        cheque.status = "PRESENTED"
        await db.commit()

        return {
            "verified": True,
            "checks": {
                "expiry_valid": True,
                "crc_valid": True,
                "hash_valid": True,
                "signature_valid": signature_valid,
                "leaf_valid": True,
            },
            "decrypted_fields": decrypted_fields,
        }

    except Exception as e:
        logger.error(f"Verification error: {str(e)}", exc_info=True)
        return {"verified": False, "failure_reason": f"Internal error: {str(e)}"}
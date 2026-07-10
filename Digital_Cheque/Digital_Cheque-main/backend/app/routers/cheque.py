from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Account, ChequeBook, ChequeLeaf, Cheque
from app.services.validator import validate_cheque_fields
from app.services.crypto import (
    canonical_serialize,
    generate_sha256_hash,
    generate_ecc_keypair,
    sign_with_ecc,
    encrypt_payload_qrc,
    compute_cross_reference_checksums,
)
from app.services.key_manager import get_bank_public_key
from app.services.qr_service import generate_qr_image
from app.services.barcode_service import generate_barcode_image
from app.services.storage import upload_cheque_file, get_presigned_url_public
from app.services.cheque_assembler import assemble_cheque
from app.routers.auth import get_current_user
from app.models import User
import datetime
import uuid
import logging

router = APIRouter(prefix="/cheques", tags=["Cheques"])
logger = logging.getLogger(__name__)


async def assign_next_leaf(db: AsyncSession, account_id: uuid.UUID) -> ChequeLeaf:
    """Assign the next available cheque leaf for an account."""
    # Try to find an existing ACTIVE leaf
    result = await db.execute(
        select(ChequeLeaf)
        .where(ChequeLeaf.account_id == account_id)
        .where(ChequeLeaf.status == "ISSUED")
        .order_by(ChequeLeaf.leaf_sequence)
        .limit(1)
    )
    leaf = result.scalars().first()
    
    if leaf:
        return leaf
    
    # No issued leaf found: create a new cheque book (auto-issue)
    # First, find the account
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get the last book sequence
    result = await db.execute(
        select(ChequeBook)
        .where(ChequeBook.account_id == account_id)
        .order_by(ChequeBook.book_sequence.desc())
        .limit(1)
    )
    last_book = result.scalars().first()
    next_seq = (last_book.book_sequence + 1) if last_book else 1
    
    # Create new book
    book = ChequeBook(
        account_id=account_id,
        book_sequence=next_seq,
        total_leaves=50,
    )
    db.add(book)
    await db.flush()
    
    # Create 50 leaves
    leaves = []
    for i in range(1, 51):
        leaf_serial = f"CHKBK-{account.account_number}-{next_seq:04d}-{i:03d}"
        leaf = ChequeLeaf(
            book_id=book.id,
            account_id=account_id,
            leaf_sequence=i,
            leaf_serial=leaf_serial,
            status="ISSUED",
        )
        leaves.append(leaf)
    
    db.add_all(leaves)
    await db.flush()
    
    # Return the first leaf
    return leaves[0]


@router.post("/create")
async def create_cheque(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new Smart Square Cheque.
    Full cryptographic signing, QR generation, PDF assembly, and MinIO storage.
    """
    try:
        # --- Step 1: Validate fields ---
        try:
            validated = validate_cheque_fields(data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # --- Step 2: Get account ---
        result = await db.execute(
            select(Account).where(Account.user_id == current_user.id)
        )
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # --- Step 3: Assign next leaf ---
        leaf = await assign_next_leaf(db, account.id)
        leaf_serial = leaf.leaf_serial
        
        # --- Step 4: Prepare cheque data ---
        expiry_date = datetime.datetime.now().date() + datetime.timedelta(days=90)
        issue_date = datetime.datetime.now().date()
        timestamp = datetime.datetime.now().isoformat()
        
        cheque_fields = {
            "payee_name": validated["payee_name"],
            "payee_account_number": validated["payee_account_number"],
            "ifsc_code": validated["ifsc_code"],
            "branch": validated["branch"],
            "bank_name": validated["bank_name"],
            "drawer_name": validated["drawer_name"],
            "amount_paise": validated["amount_paise"],
            "expanded_crores": validated["expanded_crores"],
            "expanded_lakhs": validated["expanded_lakhs"],
            "expanded_thousands": validated["expanded_thousands"],
            "expanded_hundreds": validated["expanded_hundreds"],
            "expanded_tens": validated["expanded_tens"],
            "expanded_ones": validated["expanded_ones"],
            "expanded_paise": validated["expanded_paise"],
            "cheque_date": validated["cheque_date"],
            "leaf_serial": leaf_serial,
            "account_number": account.account_number,
            "issue_date": issue_date.isoformat(),
            "expiry_date": expiry_date.isoformat(),
            "timestamp": timestamp,
            "currency": "INR",
            "version": "v1.0",
            "biometric_confirmed": False,
        }
        
        # --- Step 5: Canonical serialize + SHA-256 (QR-A) ---
        canonical_bytes = canonical_serialize(cheque_fields)
        hash_hex = generate_sha256_hash(canonical_bytes)
        
        # QR-A payload (crc_bc filled later)
        qra_payload = {
            "version": "v1.0",
            "hash": hash_hex,
            "crc_bc": None,
        }
        
        # --- Step 6: ECC Signing (temporary server-side key) ---
        # TODO: Replace with WebAuthn client-side signing in Phase 3
        ecc_private, ecc_public = generate_ecc_keypair()
        signature_hex = sign_with_ecc(ecc_private, hash_hex)
        
        # QR-B payload (crc_ac filled later)
        qrb_payload = {
            "version": "v1.0",
            "key_id": "TEMP_KEY",
            "signature": signature_hex,
            "biometric_confirmed": False,
            "crc_ac": None,
        }
        
        # --- Step 7: RSA Encryption of full payload (QR-C) ---
        bank_public_key = get_bank_public_key()
        qrc_data = encrypt_payload_qrc(cheque_fields, bank_public_key)
        qrc_payload = {
            "version": "v1.0",
            "enc_payload": qrc_data["enc_payload"],
            "iv": qrc_data["iv"],
            "tag": qrc_data["tag"],
            "enc_key": qrc_data["enc_key"],
            "crc_ab": None,
        }
        
        # --- Step 8: Cross-reference checksums ---
        final_qra, final_qrb, final_qrc = compute_cross_reference_checksums(
            qra_payload, qrb_payload, qrc_payload
        )
        
        # --- Step 9: Generate QR images ---
        qr_a_img = generate_qr_image(final_qra)
        qr_b_img = generate_qr_image(final_qrb)
        import json
        print(f"QR-C JSON size: {len(json.dumps(final_qrc))} bytes")
        qr_c_img = generate_qr_image(final_qrc, box_size=6)
        
        # --- Step 10: Generate barcode ---
        barcode_img = generate_barcode_image(leaf_serial)
        
        # --- Step 11: Assemble cheque ---
        cheque_id = uuid.uuid4()
        assembled = assemble_cheque(
            cheque_data={
                **cheque_fields,
                "cheque_id": str(cheque_id),
                "leaf_serial": leaf_serial,
                "account_number": account.account_number,
                "cheque_date": validated["cheque_date"],
                "timestamp": timestamp,
            },
            qr_a_img=qr_a_img,
            qr_b_img=qr_b_img,
            qr_c_img=qr_c_img,
            barcode_img=barcode_img,
        )
        
        # --- Step 12: Upload to MinIO ---
        png_key = upload_cheque_file(str(cheque_id), "png", assembled["png_bytes"])
        pdf_key = upload_cheque_file(str(cheque_id), "pdf", assembled["pdf_bytes"])
        
        # --- Step 13: Save to database ---
        new_cheque = Cheque(
            id=cheque_id,
            leaf_id=leaf.id,
            leaf_serial=leaf_serial,
            drawer_account_id=account.id,
            payee_account_number=validated["payee_account_number"],
            payee_name=validated["payee_name"],
            ifsc_code=validated["ifsc_code"],
            amount_paise=validated["amount_paise"],
            cheque_hash=hash_hex,
            qr_a_payload=final_qra,
            qr_b_payload=final_qrb,
            qr_c_payload=final_qrc,
            status="ISSUED",
            multi_sig_required=False,
            cosigner_account_id=None,
            issue_timestamp=datetime.datetime.now(),
            expiry_date=expiry_date,
            png_s3_key=png_key,
            pdf_s3_key=pdf_key,
            version="v1.0",
        )
        db.add(new_cheque)
        
        # Update leaf status
        leaf.status = "ACTIVE"
        leaf.activated_at = datetime.datetime.now()
        
        await db.commit()
        await db.refresh(new_cheque)
        
        # --- Step 14: Generate presigned URLs ---
        png_url = get_presigned_url_public(png_key)
        pdf_url = get_presigned_url_public(pdf_key)
        
        return {
            "cheque_id": str(cheque_id),
            "leaf_serial": leaf_serial,
            "status": "ISSUED",
            "png_download_url": png_url,
            "pdf_download_url": pdf_url,
            "message": "Cheque created successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cheque creation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{cheque_id}/download")
async def get_download_urls(
    cheque_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get presigned download URLs for a cheque.
    """
    try:
        cheque_uuid = uuid.UUID(cheque_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cheque ID")
    
    result = await db.execute(
        select(Cheque).where(Cheque.id == cheque_uuid)
    )
    cheque = result.scalars().first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    
    # Check authorization: only the user who owns the drawer account can download
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    user_account = result.scalars().first()
    if not user_account or cheque.drawer_account_id != user_account.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    png_url = get_presigned_url_public(cheque.png_s3_key)
    pdf_url = get_presigned_url_public(cheque.pdf_s3_key)
    
    return {
        "cheque_id": str(cheque.id),
        "png_download_url": png_url,
        "pdf_download_url": pdf_url,
    }
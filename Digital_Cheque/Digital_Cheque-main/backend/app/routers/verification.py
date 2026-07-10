import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import Cheque, Account, User, ChequeLeaf, OtpEvent, RiskScore
from app.routers.auth import get_current_user
from app.services.verification_service import verify_cheque
from app.services.risk_service import get_risk_score
from app.services.otp_service import generate_otp, verify_otp
from app.services.transaction_service import transfer_funds
from pydantic import BaseModel

router = APIRouter(prefix="/cheques", tags=["Verification"])


class OtpResponse(BaseModel):
    otp_code: str
    response: str  # "APPROVE" or "REJECT"


@router.post("/{cheque_id}/present")
async def present_cheque(
    cheque_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get user's account
    acc_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    user_account = acc_result.scalars().first()
    if not user_account:
        raise HTTPException(status_code=400, detail="User has no account")

    # Fetch cheque
    result = await db.execute(select(Cheque).where(Cheque.id == cheque_id))
    cheque = result.scalars().first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")

    # Verify payee matches
    if cheque.payee_account_number != user_account.account_number:
        raise HTTPException(
            status_code=403,
            detail="Only the payee can present this cheque",
        )

    # Run verification
    verif_result = await verify_cheque(db, cheque_id)
    if not verif_result["verified"]:
        raise HTTPException(
            status_code=400,
            detail=verif_result.get("failure_reason", "Verification failed"),
        )

    decrypted = verif_result["decrypted_fields"]

    # Risk score
    risk = get_risk_score(decrypted, drawer_account=user_account)

    # Save risk record
    risk_record = RiskScore(
        cheque_id=cheque.id,
        risk_score=risk["risk_score"],
        fraud_probability=risk.get("fraud_probability"),
        anomaly_score=risk.get("anomaly_score"),
        lstm_error=risk.get("lstm_error"),
        routing_decision=risk["routing"],
        shap_explanation=risk.get("shap_explanation", []),
        is_placeholder=risk.get("is_placeholder", False)
    )
    db.add(risk_record)
    await db.commit()

    if risk["routing"] == "AUTO_CLEAR":
        # Transfer immediately
        try:
            txn = await transfer_funds(db, cheque, user_account.id)
            return {
                "status": "CLEARED",
                "risk_score": risk["risk_score"],
                "transaction": txn,
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    elif risk["routing"] in ("OTP_REQUIRED", "OTP_PLUS_REVIEW"):
        # Generate OTP
        otp_code = await generate_otp(db, cheque_id, cheque.drawer_account_id)
        cheque.status = "OTP_PENDING"
        await db.commit()

        return {
            "status": "OTP_PENDING",
            "risk_score": risk["risk_score"],
            "demo_otp_code": otp_code,
            "message": "OTP sent to drawer – use demo_otp_code to test",
        }

    else:
        raise HTTPException(status_code=500, detail="Unknown routing decision")


@router.post("/{cheque_id}/otp/respond")
async def respond_otp(
    cheque_id: str,
    payload: OtpResponse,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get user's account
    acc_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    user_account = acc_result.scalars().first()
    if not user_account:
        raise HTTPException(status_code=400, detail="User has no account")

    # Fetch cheque
    result = await db.execute(select(Cheque).where(Cheque.id == cheque_id))
    cheque = result.scalars().first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")

    # Only drawer can respond
    if cheque.drawer_account_id != user_account.id:
        raise HTTPException(status_code=403, detail="Only the drawer can respond")

    if cheque.status != "OTP_PENDING":
        raise HTTPException(status_code=400, detail="Cheque not in OTP_PENDING state")

    # Verify OTP
    if not await verify_otp(db, cheque_id, payload.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Update OTP event response
    await db.execute(
        update(OtpEvent)
        .where(OtpEvent.cheque_id == cheque_id)
        .where(OtpEvent.responded_at.is_(None))
        .values(
            responded_at=datetime.datetime.now(),
            response_type=payload.response,
        )
    )

    if payload.response == "APPROVE":
        # Find payee account by payee_account_number
        payee_result = await db.execute(
            select(Account).where(Account.account_number == cheque.payee_account_number)
        )
        payee_account = payee_result.scalars().first()
        if not payee_account:
            raise HTTPException(status_code=400, detail="Payee account not found")

        try:
            txn = await transfer_funds(db, cheque, payee_account.id)
            return {
                "status": "CLEARED",
                "transaction": txn,
                "message": "Cheque cleared successfully",
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    elif payload.response == "REJECT":
        cheque.status = "REJECTED"
        # Re-activate leaf (status back to ISSUED so it can be reused)
        leaf_result = await db.execute(
            select(ChequeLeaf).where(ChequeLeaf.leaf_serial == cheque.leaf_serial)
        )
        leaf = leaf_result.scalars().first()
        if leaf:
            leaf.status = "ISSUED"
        await db.commit()
        return {"status": "REJECTED", "message": "Cheque rejected by drawer"}

    else:
        raise HTTPException(status_code=400, detail="Invalid response type")


# List cheques issued by the current user (drawer)
@router.get("/my-cheques")
async def my_cheques(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    user_account = acc_result.scalars().first()
    if not user_account:
        return []

    result = await db.execute(
        select(Cheque)
        .where(Cheque.drawer_account_id == user_account.id)
        .order_by(Cheque.issue_timestamp.desc())
    )
    cheques = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "leaf_serial": c.leaf_serial,
            "payee_name": c.payee_name,
            "amount_paise": c.amount_paise,
            "status": c.status,
            "issue_timestamp": c.issue_timestamp.isoformat(),
            "expiry_date": c.expiry_date.isoformat(),
        }
        for c in cheques
    ]


@router.get("/{cheque_id}/risk-details")
async def get_risk_details(
    cheque_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user owns the cheque (drawer or payee)
    result = await db.execute(select(Cheque).where(Cheque.id == cheque_id))
    cheque = result.scalars().first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")

    # Get user's account
    acc_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    user_account = acc_result.scalars().first()
    if not user_account:
        raise HTTPException(status_code=400, detail="User has no account")

    # Only drawer or payee can view risk details
    if cheque.drawer_account_id != user_account.id and cheque.payee_account_number != user_account.account_number:
        raise HTTPException(status_code=403, detail="Not authorized to view this cheque")

    # Fetch risk score
    risk_result = await db.execute(
        select(RiskScore).where(RiskScore.cheque_id == cheque_id)
    )
    risk = risk_result.scalars().first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk score not yet computed for this cheque")

    return {
        "cheque_id": str(cheque_id),
        "risk_score": risk.risk_score,
        "fraud_probability": float(risk.fraud_probability) if risk.fraud_probability else None,
        "anomaly_score": float(risk.anomaly_score) if risk.anomaly_score else None,
        "lstm_error": float(risk.lstm_error) if risk.lstm_error else None,
        "routing_decision": risk.routing_decision,
        "shap_explanation": risk.shap_explanation,
        "is_placeholder": risk.is_placeholder,
        "scored_at": risk.scored_at.isoformat(),
    }


# List cheques received by the current user (payee)
@router.get("/received")
async def received_cheques(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    user_account = acc_result.scalars().first()
    if not user_account:
        return []

    result = await db.execute(
        select(Cheque)
        .where(Cheque.payee_account_number == user_account.account_number)
        .order_by(Cheque.issue_timestamp.desc())
    )
    cheques = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "leaf_serial": c.leaf_serial,
            "drawer_account_id": str(c.drawer_account_id),
            "amount_paise": c.amount_paise,
            "status": c.status,
            "issue_timestamp": c.issue_timestamp.isoformat(),
            "expiry_date": c.expiry_date.isoformat(),
        }
        for c in cheques
    ]
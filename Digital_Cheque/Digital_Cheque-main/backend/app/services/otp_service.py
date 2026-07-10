import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models import OtpEvent


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def generate_otp(db: AsyncSession, cheque_id: str, account_id: str) -> str:
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = _now() + timedelta(minutes=30)
    otp_event = OtpEvent(
        cheque_id=cheque_id,
        account_id=account_id,
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(otp_event)
    await db.commit()
    # Demo: print to console
    print(f"[DEMO OTP] Cheque {cheque_id}: {otp_code}")
    return otp_code


async def verify_otp(db: AsyncSession, cheque_id: str, submitted_code: str) -> bool:
    # Get latest OTP event for this cheque
    result = await db.execute(
        select(OtpEvent)
        .where(OtpEvent.cheque_id == cheque_id)
        .order_by(desc(OtpEvent.generated_at))
        .limit(1)
    )
    otp_event = result.scalars().first()
    if not otp_event:
        return False

    if otp_event.expires_at < _now():
        return False

    if otp_event.attempt_count >= 3:
        return False

    if otp_event.otp_code != submitted_code:
        otp_event.attempt_count += 1
        await db.commit()
        return False

    # Valid OTP
    return True
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User, Account
import random
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_account_number():
    """Generate a random 12-digit account number."""
    return str(random.randint(100000000000, 999999999999))


async def generate_unique_account_number(db: AsyncSession):
    """Generate a unique 12-digit account number."""
    while True:
        num = generate_account_number()
        result = await db.execute(select(Account).where(Account.account_number == num))
        if not result.scalars().first():
            return num


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()
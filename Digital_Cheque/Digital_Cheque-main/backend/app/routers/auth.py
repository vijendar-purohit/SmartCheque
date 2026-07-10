from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.auth import UserCreate, UserLogin, AuthResponse, UserOut, AccountOut
from app.services.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_user_by_email,
    generate_unique_account_number,
)
from app.models import User, Account
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# --- Register ---
@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        mobile=user_data.mobile,
        hashed_password=hashed_pw,
        role=user_data.role.value,
    )
    db.add(new_user)
    await db.flush()  # Get the user ID

    # Generate unique account number
    account_number = await generate_unique_account_number(db)

    # Create account
    new_account = Account(
        user_id=new_user.id,
        account_number=account_number,
    )
    db.add(new_account)
    await db.commit()
    await db.refresh(new_user)
    await db.refresh(new_account)

    # Generate JWT
    token = create_access_token(data={"sub": new_user.email})

    # Build response
    return AuthResponse(
        access_token=token,
        user=UserOut(
            id=str(new_user.id),
            full_name=new_user.full_name,
            email=new_user.email,
            mobile=new_user.mobile,
            role=new_user.role,
            kyc_status=new_user.kyc_status,
            is_active=new_user.is_active,
            created_at=new_user.created_at.isoformat(),
        ),
        account=AccountOut(
            account_number=new_account.account_number,
            ifsc=new_account.ifsc,
            balance=new_account.balance_paise / 100.0,
        ),
    )


# --- Login ---
@router.post("/login", response_model=AuthResponse)
async def login(form_data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, form_data.email)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": user.email})

    # Get account
    result = await db.execute(select(Account).where(Account.user_id == user.id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return AuthResponse(
        access_token=token,
        user=UserOut(
            id=str(user.id),
            full_name=user.full_name,
            email=user.email,
            mobile=user.mobile,
            role=user.role,
            kyc_status=user.kyc_status,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        ),
        account=AccountOut(
            account_number=account.account_number,
            ifsc=account.ifsc,
            balance=account.balance_paise / 100.0,
        ),
    )


# --- Get Current User (Protected) ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user


@router.get("/me", response_model=AuthResponse)
async def read_users_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return AuthResponse(
        access_token="",  # Not needed for /me
        user=UserOut(
            id=str(current_user.id),
            full_name=current_user.full_name,
            email=current_user.email,
            mobile=current_user.mobile,
            role=current_user.role,
            kyc_status=current_user.kyc_status,
            is_active=current_user.is_active,
            created_at=current_user.created_at.isoformat(),
        ),
        account=AccountOut(
            account_number=account.account_number,
            ifsc=account.ifsc,
            balance=account.balance_paise / 100.0,
        ),
    )
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    CORPORATE = "CORPORATE"
    BANK_OFFICER = "BANK_OFFICER"


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    mobile: str = Field(..., min_length=10, max_length=15)
    role: UserRole = UserRole.INDIVIDUAL


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    mobile: str
    role: str
    kyc_status: str
    is_active: bool
    created_at: str


class AccountOut(BaseModel):
    account_number: str
    ifsc: str
    balance: float  # Rupees (paise / 100)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    account: AccountOut
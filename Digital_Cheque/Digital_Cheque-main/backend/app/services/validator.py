"""
Cheque field validation service.
Implements the 6 validation rules from the Smart Cheque spec.
"""
import re
from decimal import Decimal


def validate_cheque_fields(data: dict) -> dict:
    """
    Validate all cheque input fields.
    Returns normalized dict with amount_paise and all fields.
    Raises ValueError with specific error message on failure.
    """
    errors = []

    # 1. Validate payee_name
    payee_name = data.get("payee_name", "").strip()
    if not payee_name:
        errors.append("Payee name is required")
    elif len(payee_name) > 100:
        errors.append("Payee name must be less than 100 characters")
    elif not re.match(r"^[A-Za-z\s\.\-]+$", payee_name):
        errors.append("Payee name contains invalid characters (letters, spaces, dots, hyphens only)")

    # 2. Validate payee_account_number
    payee_account = data.get("payee_account_number", "").strip()
    if not payee_account:
        errors.append("Payee account number is required")
    elif not payee_account.isdigit():
        errors.append("Payee account number must contain only digits")
    elif len(payee_account) < 9 or len(payee_account) > 18:
        errors.append("Payee account number must be between 9 and 18 digits")

    # 3. Validate IFSC code
    ifsc = data.get("ifsc_code", "").strip().upper()
    if not ifsc:
        errors.append("IFSC code is required")
    elif len(ifsc) != 11:
        errors.append("IFSC code must be exactly 11 characters")
    elif not ifsc[:4].isalpha():
        errors.append("IFSC code first 4 characters must be letters")
    elif ifsc[4] != '0':
        errors.append("IFSC code 5th character must be '0'")
    elif not ifsc[5:].isalnum():
        errors.append("IFSC code last 6 characters must be alphanumeric")

    # 4. Validate branch and bank_name
    branch = data.get("branch", "").strip()
    bank_name = data.get("bank_name", "").strip()
    if not branch:
        errors.append("Branch name is required")
    if not bank_name:
        errors.append("Bank name is required")

    # 5. Validate drawer_name
    drawer_name = data.get("drawer_name", "").strip()
    if not drawer_name:
        errors.append("Drawer name is required")

    # 6. Validate amount
    amount_str = data.get("amount_rupees", "").strip()
    amount_paise = 0
    if not amount_str:
        errors.append("Amount is required")
    else:
        try:
            # Parse to Decimal to handle paise correctly
            amount_decimal = Decimal(amount_str)
            if amount_decimal <= 0:
                errors.append("Amount must be greater than 0")
            # Convert to paise (integer)
            amount_paise = int(amount_decimal * 100)
        except Exception:
            errors.append("Invalid amount format")

    # 7. Validate expanded fields
    try:
        expanded_crores = int(data.get("expanded_crores", 0))
        expanded_lakhs = int(data.get("expanded_lakhs", 0))
        expanded_thousands = int(data.get("expanded_thousands", 0))
        expanded_hundreds = int(data.get("expanded_hundreds", 0))
        expanded_tens = int(data.get("expanded_tens", 0))
        expanded_ones = int(data.get("expanded_ones", 0))
        expanded_paise = int(data.get("expanded_paise", 0))
        
        if any(x < 0 for x in [expanded_crores, expanded_lakhs, expanded_thousands, 
                                expanded_hundreds, expanded_tens, expanded_ones]):
            errors.append("All expanded amount fields must be non-negative")
        if expanded_paise < 0 or expanded_paise > 99:
            errors.append("Paise must be between 00 and 99")
            
        # Rule 1: Sum must match numeric amount
        expanded_sum = (
            expanded_crores * 10000000 +
            expanded_lakhs * 100000 +
            expanded_thousands * 1000 +
            expanded_hundreds * 100 +
            expanded_tens * 10 +
            expanded_ones
        ) * 100 + expanded_paise
        
        if expanded_sum != amount_paise:
            errors.append("Expanded amount sum does not match numeric amount")
            
    except ValueError:
        errors.append("Invalid expanded amount fields (must be integers)")

    # 8. Validate amount confirmation
    confirm_str = data.get("amount_confirmation", "").strip()
    if not confirm_str:
        errors.append("Amount confirmation is required")
    try:
        confirm_decimal = Decimal(confirm_str)
        confirm_paise = int(confirm_decimal * 100)
        if confirm_paise != amount_paise:
            errors.append("Amount confirmation does not match")
    except Exception:
        errors.append("Invalid amount confirmation format")

    # 9. Validate cheque date
    from datetime import datetime, timedelta
    date_str = data.get("cheque_date", "")
    if not date_str:
        errors.append("Cheque date is required")
    try:
        cheque_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = datetime.now().date()
        max_future = today + timedelta(days=90)
        min_past = today - timedelta(days=1)
        if cheque_date < min_past:
            errors.append("Cheque date cannot be more than 1 day in the past")
        if cheque_date > max_future:
            errors.append("Cheque date cannot be more than 90 days in the future")
    except ValueError:
        errors.append("Invalid date format (use YYYY-MM-DD)")

    if errors:
        raise ValueError("; ".join(errors))

    # Return normalized data
    return {
        "payee_name": payee_name,
        "payee_account_number": payee_account,
        "ifsc_code": ifsc,
        "branch": branch,
        "bank_name": bank_name,
        "drawer_name": drawer_name,
        "amount_paise": amount_paise,
        "expanded_crores": expanded_crores,
        "expanded_lakhs": expanded_lakhs,
        "expanded_thousands": expanded_thousands,
        "expanded_hundreds": expanded_hundreds,
        "expanded_tens": expanded_tens,
        "expanded_ones": expanded_ones,
        "expanded_paise": expanded_paise,
        "cheque_date": cheque_date.isoformat(),
        "amount_confirmation": confirm_paise,
    }
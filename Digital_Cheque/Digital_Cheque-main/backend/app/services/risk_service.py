from app.services.ml_inference_service import score_cheque

def get_risk_score(decrypted_fields: dict, drawer_account=None) -> dict:
    """
    Wrapper for ML inference. Falls back to rule-based if ML fails.
    """
    try:
        return score_cheque(decrypted_fields, drawer_account)
    except Exception as e:
        print(f"[ML] Inference failed, using fallback: {e}")
        amount_paise = decrypted_fields.get("amount_paise", 0)
        if amount_paise > 10_000_000:
            risk_score = 75
        elif amount_paise > 1_000_000:
            risk_score = 45
        else:
            risk_score = 15
        routing = ("AUTO_CLEAR" if risk_score <= 30
                   else "OTP_REQUIRED" if risk_score <= 70
                   else "OTP_PLUS_REVIEW")
        return {
            "risk_score": risk_score,
            "routing": routing,
            "is_placeholder": True,
            "error": str(e)
        }
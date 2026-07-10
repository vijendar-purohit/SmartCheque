"""Stub module for the ML inference service that scores SmartCheques.

The real model is loaded by `ml_inference_service.py`; this stub
exposes the same `score_cheque` signature so callers can be wired up
and unit-tested without depending on the model weights or runtime.
"""


def score_cheque(cheque_data: dict) -> dict:
    """
    Runs the SmartCheque fraud / risk model on a single cheque.

    Parameters
    ----------
    cheque_data : dict
        Normalized cheque fields (drawer, payee, amount, MICR, QR zones,
        historical aggregates, etc.) — the exact schema is defined by the
        feature pipeline feeding this model.

    Returns
    -------
    dict
        Scoring result, expected to contain at least:
          - ``risk_score`` (float in [0.0, 1.0])
          - ``risk_band``  (one of ``"low"``, ``"medium"``, ``"high"``)
          - ``reasons``    (list[str] of human-readable contributing factors)
          - ``model_version`` (str identifying the model artifact used)
    """
    raise NotImplementedError("Implementation not included in this repo")

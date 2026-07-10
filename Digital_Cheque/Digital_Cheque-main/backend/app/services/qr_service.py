"""
QR code generation service.
"""
import json
import qrcode
from PIL import Image


def generate_qr_image(payload_dict: dict, box_size: int = 10, border: int = 2) -> Image.Image:
    json_str = json.dumps(payload_dict, separators=(',', ':'), sort_keys=True)
    # Try M first (more capacity), fallback to L if still too big
    for level in [qrcode.constants.ERROR_CORRECT_M, qrcode.constants.ERROR_CORRECT_L]:
        try:
            qr = qrcode.QRCode(version=None, error_correction=level, box_size=box_size, border=border)
            qr.add_data(json_str)
            qr.make(fit=True)
            return qr.make_image(fill_color='black', back_color='white')
        except ValueError:
            continue
    raise ValueError("QR payload too large even at lowest error correction")
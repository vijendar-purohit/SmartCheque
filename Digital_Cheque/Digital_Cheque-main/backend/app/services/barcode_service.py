"""
Barcode generation service.
"""
import io
from PIL import Image
from barcode import Code128
from barcode.writer import ImageWriter


def generate_barcode_image(leaf_serial: str) -> Image.Image:
    """
    Generate a Code128 barcode image for a cheque leaf serial.
    Returns a PIL Image resized to (600, 80).
    """
    # Generate barcode
    barcode_obj = Code128(leaf_serial, writer=ImageWriter())
    buffer = io.BytesIO()
    barcode_obj.write(
        buffer,
        options={
            'module_width': 0.3,
            'module_height': 10.0,
            'quiet_zone': 2.0,
            'font_size': 8,
            'text_distance': 3.0,
        }
    )
    buffer.seek(0)
    img = Image.open(buffer).convert('RGB')
    
    # Resize to target dimensions
    img = img.resize((600, 80), Image.Resampling.LANCZOS)
    return img
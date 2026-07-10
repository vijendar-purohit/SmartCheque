"""
MICR line rendering service.
"""
from PIL import Image, ImageDraw, ImageFont


def render_micr_line(
    draw: ImageDraw.ImageDraw,
    leaf_number: int,
    account_number: str,
    bank_micr_code: str,
    canvas_height: int,
    left_margin: int = 20,
):
    """
    Render a synthetic MICR line in E-13B format.
    Falls back to bold monospace font if E-13B TTF is not available.
    """
    # Format the MICR string
    # transit character: \u2446 (⑆)
    micr_str = (
        f'\u2446{leaf_number:06d}\u2446  '
        f'\u2446{account_number}\u2446  '
        f'\u2446{bank_micr_code:0>9}\u2446'
    )
    
    # Try to load E-13B font, fallback to bold monospace
    try:
        # If you have an E-13B TTF file, place it in backend/fonts/
        font = ImageFont.truetype("fonts/micr_e13b.ttf", size=28)
    except (OSError, IOError):
        # Try DejaVu if installed
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", size=28)
        except (OSError, IOError):
            # Last resort: default PIL font
            font = ImageFont.load_default()
    
    # Position: bottom edge, 35px from bottom
    micr_y = canvas_height - 35
    draw.text((left_margin, micr_y), micr_str, font=font, fill='black')


def render_micr_line_image(leaf_number: int, account_number: str, bank_micr_code: str, font_size: int = 28) -> Image.Image:
    """
    Create a standalone horizontal MICR image that can be rotated.
    Returns a PIL Image (RGB) with the MICR string drawn.
    """
    # Format the MICR string (same as before)
    micr_str = (
        f'|{leaf_number:06d}|  '
        f'|{account_number}|  '
        f'|{bank_micr_code:0>9}|'
    )

    # Try to load a font, fallback
    try:
        font = ImageFont.truetype("fonts/micr_e13b.ttf", size=font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", size=font_size)
        except (OSError, IOError):
            font = ImageFont.load_default()

    # Calculate the required width (approx)
    # We'll create a large enough temp image, draw, then crop later
    temp_width = 1200
    temp_height = font_size + 20  # padding
    img = Image.new('RGB', (temp_width, temp_height), 'white')
    draw = ImageDraw.Draw(img)

    # Draw the MICR string
    draw.text((10, 10), micr_str, font=font, fill='black')

    # Crop to the actual content with generous padding
    bbox = img.getbbox()
    if bbox:
        img = img.crop((
            max(0, bbox[0] - 10),
            max(0, bbox[1] - 5),
            min(temp_width, bbox[2] + 10),
            min(temp_height, bbox[3] + 5)
        ))

    return img
import os

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def looks_like_image_filename(value):
    name = os.path.basename((value or "").strip())
    return os.path.splitext(name)[1].lower() in ALLOWED_IMAGE_EXTENSIONS
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_uploaded_image(uploaded):
    """Reject anything that is not a small image file."""
    name = getattr(uploaded, "name", "") or ""
    extension = os.path.splitext(name)[1].lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError("Upload a JPG, PNG, WEBP, or GIF image.")
    size = getattr(uploaded, "size", None)
    if size is not None and size > MAX_IMAGE_BYTES:
        raise ValidationError("Image must be 5 MB or smaller.")
    if not hasattr(uploaded, "read"):
        return
    start = uploaded.tell() if hasattr(uploaded, "tell") else 0
    try:
        with Image.open(uploaded) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValidationError("Upload a JPG, PNG, WEBP, or GIF image.") from exc
    finally:
        if hasattr(uploaded, "seek"):
            uploaded.seek(start)

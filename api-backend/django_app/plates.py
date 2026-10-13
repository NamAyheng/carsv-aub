import re

from django.core.exceptions import ValidationError

# 2, then one letter or two letters, a hyphen, and four digits. Examples: 2A-1234, 2BD-9988.
PLATE_RE = re.compile(r"^2[A-Z]{1,2}-\d{4}$")
PLATE_HELP = "Use 2, then 1 or 2 letters, a hyphen, and 4 digits. Example: 2BD-9988."


def normalize_vehicle_plate(value):
    return re.sub(r"\s+", "", (value or "")).upper()


def require_vehicle_plate(value):
    plate = normalize_vehicle_plate(value)
    if not PLATE_RE.fullmatch(plate):
        raise ValidationError(PLATE_HELP)
    return plate

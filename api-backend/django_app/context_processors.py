from django.db.models import F
from django.urls import reverse

from django_app.dashboard import ROLE_DESK, ROLE_LABEL
from django_app.models import Booking, Invoice, SparePart, role_display_name

PAGE_TITLES = {
    "customer": "Customers",
    "vehicle": "Vehicles",
    "booking": "Bookings",
    "service": "Service catalog",
    "servicecategory": "Service categories",
    "repairjob": "Work orders",
    "inspection": "Inspections",
    "mechanic": "Technicians",
    "staff": "Staff",
    "sparepart": "Parts inventory",
    "sparepartcategory": "Part categories",
    "partsusage": "Parts usage",
    "invoice": "Invoices",
    "payment": "Payments",
    "user": "Users",
    "role": "Roles",
    "group": "Groups",
}


def _page_title(request, desk):
    match = getattr(request, "resolver_match", None)
    name = getattr(match, "url_name", "") or ""
    model = ""
    for prefix in ("django_app_", "auth_"):
        if name.startswith(prefix):
            model = name[len(prefix) :]
            break
    for suffix in ("_changelist", "_change", "_add", "_history", "_delete"):
        if model.endswith(suffix):
            model = model[: -len(suffix)]
            break
    return PAGE_TITLES.get(model, desk)


def _alerts():
    alerts = []
    low = SparePart.objects.filter(quantity__lte=F("min_stock")).order_by("quantity")
    if low.exists():
        sample = ", ".join(f"{part.name} ({part.quantity} left)" for part in low[:3])
        alerts.append(
            {
                "title": "Low stock",
                "message": sample,
                "url": reverse("admin:django_app_sparepart_changelist") + "?stock=LOW",
            }
        )
    pending = Booking.objects.filter(status=Booking.Status.PENDING).count()
    if pending:
        alerts.append(
            {
                "title": "Pending bookings",
                "message": f"{pending} booking(s) waiting at the front desk.",
                "url": reverse("admin:django_app_booking_changelist"),
            }
        )
    unpaid = Invoice.objects.filter(status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT)).count()
    if unpaid:
        alerts.append(
            {
                "title": "Open invoices",
                "message": f"{unpaid} invoice(s) still awaiting payment.",
                "url": reverse("admin:django_app_invoice_changelist") + "?status=UNPAID",
            }
        )
    return alerts


def carsv_header(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated or not user.is_staff:
        return {}
    role = getattr(user, "role", "ADMIN")
    desk = ROLE_DESK.get(role, "Admin console")
    first = user.first_name or user.username
    last = user.last_name or ""
    initials = f"{first[:1]}{last[:1]}".upper() or user.username[:2].upper()
    return {
        "carsv_header": {
            "title": _page_title(request, desk),
            "desk": desk,
            "role_label": role_display_name(role) or ROLE_LABEL.get(role, user.get_role_display() if hasattr(user, "get_role_display") else role),
            "full_name": user.get_full_name() or user.username,
            "email": user.email,
            "initials": initials,
            "photo": getattr(user, "photo", "") or "",
            "alerts": _alerts(),
        }
    }

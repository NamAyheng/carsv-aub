"""Garage reports admin UI — Administrator + Manager."""

from datetime import timedelta
from decimal import Decimal

from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import PermissionDenied
from django.db.models import Count, F, Sum
from django.shortcuts import render
from django.utils.dateparse import parse_date
from django.utils.timezone import localdate

from django_app.models import Booking, GarageReport, Invoice, Payment, RepairJob, SparePart
from django_app.role_access import can_access_module


def user_is_administrator(user) -> bool:
    """Backward-compatible alias: reports allowed for Admin + Manager."""
    return can_access_module(user, "reports")


def can_view_garage_reports(request) -> bool:
    """Unfold sidebar permission callback."""
    return can_access_module(request.user, "reports")


def _parse_range(request):
    today = localdate()
    raw_from = (request.GET.get("from") or "").strip()
    raw_to = (request.GET.get("to") or "").strip()
    start = parse_date(raw_from) if raw_from else today - timedelta(days=30)
    end = parse_date(raw_to) if raw_to else today
    if start is None:
        start = today - timedelta(days=30)
    if end is None:
        end = today
    if start > end:
        start, end = end, start
    return start, end


@staff_member_required
def garage_reports(request):
    if not can_access_module(request.user, "reports"):
        raise PermissionDenied("Only Administrator or Manager can open garage reports.")

    start, end = _parse_range(request)
    report_type = (request.GET.get("type") or "summary").strip().lower()
    if report_type not in {"summary", "bookings", "repairs", "payments", "revenue"}:
        report_type = "summary"

    bookings = Booking.objects.filter(booking_date__gte=start, booking_date__lte=end)
    repairs = RepairJob.objects.filter(start_date__gte=start, start_date__lte=end)
    repairs_fallback = RepairJob.objects.filter(
        start_date__isnull=True,
        booking__booking_date__gte=start,
        booking__booking_date__lte=end,
    )
    payments = Payment.objects.filter(paid_at__gte=start, paid_at__lte=end, status=Payment.Status.PAID)
    invoices = Invoice.objects.filter(invoice_date__gte=start, invoice_date__lte=end)

    booking_rows = list(
        bookings.select_related("customer", "vehicle", "service").order_by("-booking_date", "-id")[:200]
    )
    repair_qs = repairs if repairs.exists() else repairs_fallback
    repair_rows = list(
        repair_qs.select_related("customer", "vehicle", "mechanic__user", "booking__service").order_by(
            "-id"
        )[:200]
    )
    payment_rows = list(
        payments.select_related("customer", "invoice", "vehicle").order_by("-paid_at", "-id")[:200]
    )

    paid_total = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    invoice_total = invoices.filter(status=Invoice.Status.PAID).aggregate(total=Sum("grand_total"))[
        "total"
    ] or Decimal("0")

    status_counts = {row["status"]: row["c"] for row in bookings.values("status").annotate(c=Count("id"))}
    repair_status_counts = {
        row["status"]: row["c"] for row in repair_qs.values("status").annotate(c=Count("id"))
    }

    # Use the same admin context as other Unfold pages so the full sidebar stays.
    context = {
        **admin.site.each_context(request),
        "title": "Garage reports",
        "opts": GarageReport._meta,
        "app_label": "django_app",
        "cl": None,
        "start": start,
        "end": end,
        "report_type": report_type,
        "summary": {
            "bookings": bookings.count(),
            "repairs": repair_qs.count(),
            "payments": payments.count(),
            "paid_total": paid_total,
            "invoice_paid_total": invoice_total,
            "pending_invoices": invoices.filter(
                status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT)
            ).count(),
            "low_stock": SparePart.objects.filter(quantity__lte=F("min_stock")).count(),
            "booking_status": status_counts,
            "repair_status": repair_status_counts,
        },
        "booking_rows": booking_rows,
        "repair_rows": repair_rows,
        "payment_rows": payment_rows,
        "has_permission": True,
        "is_popup": False,
        "is_nav_sidebar_enabled": True,
    }
    return render(request, "admin/django_app/garage_reports.html", context)

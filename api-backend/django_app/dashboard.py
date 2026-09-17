from decimal import Decimal

from django.db.models import F, Sum
from django.urls import reverse
from django.utils.timezone import localdate

from django_app.models import (
    Booking,
    Invoice,
    Mechanic,
    Payment,
    RepairJob,
    SparePart,
    Vehicle,
    current_customer_qs,
)

ROLE_LABEL = {
    "ADMIN": "Administrator",
    "RECEPTIONIST": "Front desk",
    "MECHANIC": "Mechanic",
    "CASHIER": "Cashier",
    "MANAGER": "Manager",
    "CUSTOMER": "Customer",
}

ROLE_DESK = {
    "ADMIN": "Admin console",
    "RECEPTIONIST": "Front desk",
    "MECHANIC": "Workshop",
    "CASHIER": "Finance desk",
    "MANAGER": "Manager desk",
    "CUSTOMER": "Customer portal",
}

ROLE_FOCUS = {
    "ADMIN": "Users, permissions, security, and garage settings",
    "RECEPTIONIST": "Bookings, vehicle check-in, invoices, and payments",
    "MECHANIC": "Assigned jobs, diagnosis, parts on the job, and workshop bay",
    "CASHIER": "Invoices, payments, and receipts",
    "MANAGER": "Revenue, technician workload, stock, and reports",
    "CUSTOMER": "Your vehicles, appointments, and bills",
}

JOB_BADGE = {
    RepairJob.Status.WAITING: ("pending", "PENDING"),
    RepairJob.Status.DIAGNOSING: ("progress", "IN PROGRESS"),
    RepairJob.Status.WAITING_APPROVAL: ("assigned", "ASSIGNED"),
    RepairJob.Status.REPAIRING: ("progress", "IN PROGRESS"),
    RepairJob.Status.WAITING_PARTS: ("assigned", "WAITING PARTS"),
    RepairJob.Status.QUALITY_CHECK: ("progress", "QUALITY CHECK"),
    RepairJob.Status.READY_FOR_PICKUP: ("assigned", "READY FOR PICKUP"),
    RepairJob.Status.COMPLETED: ("done", "COMPLETED"),
}

ACTIVE_JOBS = [
    RepairJob.Status.WAITING,
    RepairJob.Status.DIAGNOSING,
    RepairJob.Status.WAITING_APPROVAL,
    RepairJob.Status.REPAIRING,
    RepairJob.Status.WAITING_PARTS,
    RepairJob.Status.QUALITY_CHECK,
    RepairJob.Status.READY_FOR_PICKUP,
]

ON_HOIST = [
    RepairJob.Status.DIAGNOSING,
    RepairJob.Status.REPAIRING,
    RepairJob.Status.QUALITY_CHECK,
]


def badge_vehicles_in_shop(request):
    count = Vehicle.objects.filter(status=Vehicle.Status.IN_SHOP).count()
    return count or None


def badge_bookings(request):
    count = Booking.objects.filter(status=Booking.Status.PENDING).count()
    return count or None


def badge_jobs(request):
    count = RepairJob.objects.filter(status__in=ACTIVE_JOBS).count()
    return count or None


def badge_low_stock(request):
    count = SparePart.objects.filter(quantity__lte=F("min_stock")).count()
    return f"{count} alert" if count else None


def badge_unpaid_invoices(request):
    count = Invoice.objects.filter(
        status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT)
    ).count()
    return count or None


def dashboard_callback(request, context):
    today = localdate()
    paid = Invoice.objects.filter(status=Invoice.Status.PAID)
    revenue = paid.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
    last_week = paid.filter(invoice_date__lt=today).aggregate(total=Sum("grand_total"))["total"] or Decimal("0")

    active_jobs = RepairJob.objects.filter(status__in=ACTIVE_JOBS)
    on_hoist = RepairJob.objects.filter(status__in=ON_HOIST).count()
    today_bookings = Booking.objects.filter(booking_date=today).exclude(status=Booking.Status.CANCELLED)
    confirmed_today = today_bookings.filter(status=Booking.Status.CONFIRMED).count()
    low_stock = SparePart.objects.filter(quantity__lte=F("min_stock")).order_by("quantity")

    live_jobs = []
    for job in RepairJob.objects.select_related("vehicle", "mechanic__user", "booking__service").order_by("-id")[:8]:
        badge_class, badge_label = JOB_BADGE.get(job.status, ("pending", job.get_status_display()))
        live_jobs.append(
            {
                "number": f"JOB-{job.id:04d}",
                "vehicle": f"{job.vehicle.brand} {job.vehicle.model} ({job.vehicle.year})",
                "plate": job.vehicle.plate,
                "service": (job.booking.service.name if job.booking_id else job.problem) or job.problem,
                "tech": str(job.mechanic) if job.mechanic_id else "Unassigned",
                "badge_class": badge_class,
                "badge_label": badge_label,
                "url": reverse("admin:django_app_repairjob_change", args=[job.id]),
            }
        )

    pending_bookings = Booking.objects.filter(status=Booking.Status.PENDING).select_related(
        "vehicle", "service"
    )
    for booking in pending_bookings:
        if hasattr(booking, "repair_job"):
            continue
        live_jobs.append(
            {
                "number": f"BK-{booking.id:04d}",
                "vehicle": f"{booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})",
                "plate": booking.vehicle.plate,
                "service": booking.service.name if booking.service_id else booking.problem,
                "tech": "Unassigned",
                "badge_class": "pending",
                "badge_label": "PENDING",
                "url": reverse("admin:django_app_booking_change", args=[booking.id]),
            }
        )

    technicians = []
    for mechanic in Mechanic.objects.select_related("user").filter(status=Mechanic.Status.ACTIVE):
        busy_count = mechanic.repair_jobs.filter(status__in=ACTIVE_JOBS).count()
        technicians.append(
            {
                "name": str(mechanic),
                "initials": _initials(mechanic.user),
                "specialization": mechanic.specialization or mechanic.skills or "General",
                "busy": (not mechanic.available) or busy_count > 0,
                "jobs": busy_count,
            }
        )

    bay_vehicle = Vehicle.objects.filter(status=Vehicle.Status.IN_SHOP).select_related("customer").first()
    bay_job = None
    if bay_vehicle:
        bay_job = RepairJob.objects.filter(vehicle=bay_vehicle).select_related("mechanic__user").order_by("-id").first()

    user = request.user
    role = getattr(user, "role", "ADMIN")
    context.update(
        {
            "carsv": {
                "first_name": user.first_name or user.username,
                "full_name": user.get_full_name() or user.username,
                "role_label": ROLE_LABEL.get(role, role),
                "role_desk": ROLE_DESK.get(role, "Admin console"),
                "role_focus": ROLE_FOCUS.get(role, ""),
                "revenue": revenue,
                "last_week": last_week,
                "active_repairs": active_jobs.count(),
                "on_hoist": on_hoist,
                "appointments": today_bookings.count(),
                "confirmed_today": confirmed_today,
                "low_stock_count": low_stock.count(),
                "low_stock": low_stock[:4],
                "live_jobs": live_jobs[:5],
                "job_total": RepairJob.objects.count() + pending_bookings.count(),
                "technicians": technicians[:4],
                "busy_techs": sum(1 for row in technicians if row["busy"]),
                "bay_vehicle": bay_vehicle,
                "bay_job": bay_job,
                "customer_count": current_customer_qs().count(),
                "vehicle_count": Vehicle.objects.count(),
                "paid_count": Payment.objects.filter(status=Payment.Status.PAID).count(),
                "today": today,
            }
        }
    )
    return context


def _initials(user):
    parts = [user.first_name, user.last_name]
    letters = "".join(part[:1] for part in parts if part)
    return (letters or user.username[:2]).upper()[:2]

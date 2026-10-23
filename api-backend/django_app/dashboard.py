from decimal import Decimal

from django.db.models import F, Sum
from django.urls import reverse
from django.utils.timezone import localdate

from django_app.models import (
    Booking,
    Invoice,
    Mechanic,
    Payment,
    PartRequest,
    RepairJob,
    SparePart,
    User,
    Vehicle,
    current_customer_qs,
)
from django_app.role_access import can_access_module, staff_role

ROLE_LABEL = {
    "ADMIN": "Administrator",
    "RECEPTIONIST": "Receptionist",
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
    "ADMIN": "Users, permissions, security, and full garage control",
    "RECEPTIONIST": "Customers, vehicles, bookings, and check-in / work orders",
    "MECHANIC": "Your assigned jobs, diagnosis, parts on the job, and bay work",
    "CASHIER": "Invoices, payments, and receipts",
    "MANAGER": "Revenue, technician workload, stock, and reports",
    "CUSTOMER": "Your vehicles, appointments, and bills",
}

JOB_BADGE = {
    RepairJob.Status.WAITING: ("pending", "PENDING"),
    RepairJob.Status.DIAGNOSING: ("progress", "IN PROGRESS"),
    RepairJob.Status.WAITING_APPROVAL: ("assigned", "ASSIGNED"),
    RepairJob.Status.REPAIRING: ("progress", "IN PROGRESS"),
    RepairJob.Status.QUALITY_CHECK: ("progress", "QUALITY CHECK"),
    RepairJob.Status.READY_FOR_PICKUP: ("assigned", "READY FOR PICKUP"),
    RepairJob.Status.COMPLETED: ("done", "COMPLETED"),
}

ACTIVE_JOBS = [
    RepairJob.Status.WAITING,
    RepairJob.Status.DIAGNOSING,
    RepairJob.Status.WAITING_APPROVAL,
    RepairJob.Status.REPAIRING,
    RepairJob.Status.QUALITY_CHECK,
    RepairJob.Status.READY_FOR_PICKUP,
]

ON_HOIST = [
    RepairJob.Status.DIAGNOSING,
    RepairJob.Status.REPAIRING,
    RepairJob.Status.QUALITY_CHECK,
]


def badge_vehicles_in_shop(request):
    if not can_access_module(request.user, "vehicles"):
        return None
    count = Vehicle.objects.filter(status=Vehicle.Status.IN_SHOP).count()
    return count or None


def badge_bookings(request):
    if not can_access_module(request.user, "bookings"):
        return None
    count = Booking.objects.filter(status=Booking.Status.PENDING).count()
    return count or None


def badge_jobs(request):
    if not can_access_module(request.user, "repair_jobs"):
        return None
    qs = RepairJob.objects.filter(status__in=ACTIVE_JOBS)
    if staff_role(request.user) == User.Role.MECHANIC:
        qs = qs.filter(mechanic__user=request.user)
    count = qs.count()
    return count or None


def badge_low_stock(request):
    if not can_access_module(request.user, "spare_parts"):
        return None
    count = SparePart.objects.filter(quantity__lte=F("min_stock")).count()
    return f"{count} alert" if count else None


def badge_part_requests(request):
    if not can_access_module(request.user, "part_requests"):
        return None
    count = PartRequest.objects.filter(status=PartRequest.Status.PENDING).count()
    return count or None


def badge_unpaid_invoices(request):
    if not can_access_module(request.user, "invoices"):
        return None
    count = Invoice.objects.filter(
        status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT)
    ).count()
    return count or None


def _kpi(label, value, sub, url, icon="space_dashboard", tone=""):
    return {
        "label": label,
        "value": value,
        "sub": sub,
        "url": url,
        "icon": icon,
        "tone": tone,
    }


def dashboard_callback(request, context):
    today = localdate()
    user = request.user
    role = staff_role(user) or getattr(user, "role", "ADMIN")

    paid = Invoice.objects.filter(status=Invoice.Status.PAID)
    revenue = paid.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
    last_week = paid.filter(invoice_date__lt=today).aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
    revenue_today = (
        Payment.objects.filter(status=Payment.Status.PAID, paid_at=today).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    jobs_qs = RepairJob.objects.all()
    if role == User.Role.MECHANIC:
        jobs_qs = jobs_qs.filter(mechanic__user=user)

    active_jobs = jobs_qs.filter(status__in=ACTIVE_JOBS)
    on_hoist = jobs_qs.filter(status__in=ON_HOIST).count()
    today_bookings = Booking.objects.filter(booking_date=today).exclude(status=Booking.Status.CANCELLED)
    confirmed_today = today_bookings.filter(status=Booking.Status.CONFIRMED).count()
    low_stock = SparePart.objects.filter(quantity__lte=F("min_stock")).order_by("quantity")
    pending_payments = Invoice.objects.filter(
        status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT)
    ).count()
    ready_pickup = jobs_qs.filter(status=RepairJob.Status.READY_FOR_PICKUP).count()
    pending_parts = PartRequest.objects.filter(status=PartRequest.Status.PENDING).count()

    completed_jobs = RepairJob.objects.filter(
        status=RepairJob.Status.COMPLETED,
        start_date__isnull=False,
        estimated_end__isnull=False,
    )
    avg_days = None
    durations = []
    for job in completed_jobs.only("start_date", "estimated_end")[:200]:
        if job.start_date and job.estimated_end and job.estimated_end >= job.start_date:
            durations.append((job.estimated_end - job.start_date).days)
    if durations:
        avg_days = round(sum(durations) / len(durations), 1)

    live_jobs = []
    for job in jobs_qs.select_related("vehicle", "mechanic__user", "booking__service").order_by("-id")[:8]:
        badge_class, badge_label = JOB_BADGE.get(job.status, ("pending", job.get_status_display()))
        live_jobs.append(
            {
                "number": f"WO-{job.id:04d}",
                "vehicle": f"{job.vehicle.brand} {job.vehicle.model} ({job.vehicle.year})",
                "plate": job.vehicle.plate,
                "service": (job.booking.service.name if job.booking_id else job.problem) or job.problem,
                "tech": str(job.mechanic) if job.mechanic_id else "Unassigned",
                "badge_class": badge_class,
                "badge_label": badge_label,
                "url": reverse("admin:django_app_repairjob_change", args=[job.id]),
            }
        )

    pending_bookings = Booking.objects.filter(status=Booking.Status.PENDING).select_related("vehicle", "service")
    if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST}:
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

    url_bookings = reverse("admin:django_app_booking_changelist")
    url_jobs = reverse("admin:django_app_repairjob_changelist")
    url_invoices = reverse("admin:django_app_invoice_changelist")
    url_payments = reverse("admin:django_app_payment_changelist")
    url_parts = reverse("admin:django_app_sparepart_changelist")
    url_vehicles = reverse("admin:django_app_vehicle_changelist")
    url_customers = reverse("admin:django_app_customer_changelist")
    url_reports = reverse("admin:django_app_garagereport_changelist")
    url_part_req = reverse("admin:django_app_partrequest_changelist")
    url_users = reverse("admin:django_app_user_changelist")

    kpis = []
    if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST}:
        kpis.append(
            _kpi(
                "Today bookings",
                f"{today_bookings.count():02d}",
                f"{confirmed_today} confirmed · {today}",
                url_bookings,
                "event",
            )
        )
    if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST, User.Role.MECHANIC}:
        label = "My active jobs" if role == User.Role.MECHANIC else "Active repairs"
        kpis.append(
            _kpi(
                label,
                f"{active_jobs.count():02d}",
                f"{on_hoist} on hoist · {ready_pickup} ready",
                url_jobs,
                "directions_car",
                "blue",
            )
        )
    if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.CASHIER, User.Role.RECEPTIONIST}:
        kpis.append(
            _kpi(
                "Pending payments",
                f"{pending_payments:02d}",
                "Unpaid / partial / draft invoices",
                url_invoices,
                "payments",
                "warn",
            )
        )
    if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.CASHIER}:
        kpis.append(
            _kpi(
                "Revenue today",
                f"${revenue_today:,.0f}",
                f"All-time paid ${revenue:,.0f} · {Payment.objects.filter(status=Payment.Status.PAID).count()} receipts",
                url_payments,
                "attach_money",
                "ok",
            )
        )
    if role in {User.Role.ADMIN, User.Role.MANAGER}:
        kpis.append(
            _kpi(
                "Avg repair days",
                f"{avg_days}" if avg_days is not None else "—",
                f"From {len(durations)} completed jobs" if durations else "Needs start + end dates",
                url_jobs,
                "timer",
                "blue",
            )
        )
        kpis.append(
            _kpi(
                "Low stock items",
                f"{low_stock.count():02d}",
                "Requires reordering",
                url_parts,
                "warning",
                "danger",
            )
        )
        kpis.append(
            _kpi(
                "Garage reports",
                "Open",
                "Bookings · repairs · payments · revenue",
                url_reports,
                "summarize",
            )
        )
    if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST}:
        kpis.append(
            _kpi(
                "Fleet snapshot",
                str(Vehicle.objects.count()),
                f"{current_customer_qs().count()} customers on file",
                url_vehicles,
                "garage",
            )
        )
    if role == User.Role.MECHANIC:
        kpis.append(
            _kpi(
                "Part requests",
                f"{pending_parts:02d}",
                "Pending workshop requests",
                url_part_req,
                "shopping_bag",
                "warn",
            )
        )
        kpis.append(
            _kpi(
                "Low stock",
                f"{low_stock.count():02d}",
                "Parts that may block your job",
                url_parts,
                "warning",
                "danger",
            )
        )
    if role == User.Role.CASHIER:
        kpis.append(
            _kpi(
                "Paid receipts",
                str(Payment.objects.filter(status=Payment.Status.PAID).count()),
                "Verified payments on file",
                url_payments,
                "receipt_long",
                "ok",
            )
        )
        kpis.append(
            _kpi(
                "Ready for pickup",
                f"{ready_pickup:02d}",
                "Jobs waiting on payment / handover",
                url_invoices,
                "outbound",
            )
        )
    if role == User.Role.ADMIN:
        kpis.append(
            _kpi(
                "Staff accounts",
                str(User.objects.exclude(role=User.Role.CUSTOMER).count()),
                "Users & roles under Accounts",
                url_users,
                "manage_accounts",
            )
        )

    show_live = role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST, User.Role.MECHANIC}
    show_bay = role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.MECHANIC, User.Role.RECEPTIONIST}
    show_techs = role in {User.Role.ADMIN, User.Role.MANAGER}
    show_inventory = role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.MECHANIC}
    show_cta = role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST}
    show_cashier_cta = role == User.Role.CASHIER

    context.update(
        {
            "carsv": {
                "first_name": user.first_name or user.username,
                "full_name": user.get_full_name() or user.username,
                "email": user.email or "",
                "role": role,
                "role_label": ROLE_LABEL.get(role, role),
                "role_desk": ROLE_DESK.get(role, "Admin console"),
                "role_focus": ROLE_FOCUS.get(role, ""),
                "kpis": kpis,
                "show_live_jobs": show_live,
                "show_bay": show_bay,
                "show_technicians": show_techs,
                "show_inventory": show_inventory,
                "show_cta": show_cta,
                "show_cashier_cta": show_cashier_cta,
                "revenue": revenue,
                "last_week": last_week,
                "active_repairs": active_jobs.count(),
                "on_hoist": on_hoist,
                "appointments": today_bookings.count(),
                "confirmed_today": confirmed_today,
                "low_stock_count": low_stock.count(),
                "low_stock": low_stock[:4],
                "live_jobs": live_jobs[:5],
                "job_total": jobs_qs.count()
                + (pending_bookings.count() if role in {User.Role.ADMIN, User.Role.MANAGER, User.Role.RECEPTIONIST} else 0),
                "technicians": technicians[:4],
                "busy_techs": sum(1 for row in technicians if row["busy"]),
                "bay_vehicle": bay_vehicle,
                "bay_job": bay_job,
                "customer_count": current_customer_qs().count(),
                "vehicle_count": Vehicle.objects.count(),
                "paid_count": Payment.objects.filter(status=Payment.Status.PAID).count(),
                "revenue_today": revenue_today,
                "pending_payments": pending_payments,
                "ready_pickup": ready_pickup,
                "avg_repair_days": avg_days,
                "completed_for_avg": len(durations),
                "reports_url": url_reports,
                "jobs_url": url_jobs,
                "bookings_url": url_bookings,
                "customers_url": url_customers,
                "vehicles_url": url_vehicles,
                "invoices_url": url_invoices,
                "payments_url": url_payments,
                "parts_url": url_parts,
                "mechanics_url": reverse("admin:django_app_mechanic_changelist"),
                "today": today,
            }
        }
    )
    return context


def _initials(user):
    parts = [user.first_name, user.last_name]
    letters = "".join(part[:1] for part in parts if part)
    return (letters or user.username[:2]).upper()[:2]

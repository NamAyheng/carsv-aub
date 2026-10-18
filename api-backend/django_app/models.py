from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import F, Q, Sum
from django.utils import timezone
from django.db.models.deletion import ProtectedError
from django.db.utils import OperationalError, ProgrammingError

from .uploads import validate_uploaded_image


DEFAULT_ROLES = (
    {
        "code": "ADMIN",
        "name": "Administrator",
        "in_customers": False,
        "in_staff": True,
        "in_technicians": False,
        "default_position": "Administrator",
        "default_department": "Office",
        "sort_order": 1,
    },
    {
        "code": "MANAGER",
        "name": "Manager",
        "in_customers": False,
        "in_staff": True,
        "in_technicians": False,
        "default_position": "Manager",
        "default_department": "Office",
        "sort_order": 2,
    },
    {
        "code": "RECEPTIONIST",
        "name": "Receptionist",
        "in_customers": False,
        "in_staff": True,
        "in_technicians": False,
        "default_position": "Front desk",
        "default_department": "Reception",
        "sort_order": 3,
    },
    {
        "code": "MECHANIC",
        "name": "Mechanic",
        "in_customers": False,
        "in_staff": True,
        "in_technicians": True,
        "default_position": "Mechanic",
        "default_department": "Workshop",
        "sort_order": 4,
    },
    {
        "code": "CASHIER",
        "name": "Cashier",
        "in_customers": False,
        "in_staff": True,
        "in_technicians": False,
        "default_position": "Cashier",
        "default_department": "Finance",
        "sort_order": 5,
    },
    {
        "code": "CUSTOMER",
        "name": "Customer",
        "in_customers": True,
        "in_staff": False,
        "in_technicians": False,
        "default_position": "",
        "default_department": "",
        "sort_order": 6,
    },
)


class Role(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    in_customers = models.BooleanField("show in customers", default=False)
    in_staff = models.BooleanField("show in staff", default=False)
    in_technicians = models.BooleanField("show in technicians", default=False)
    default_position = models.CharField(max_length=80, blank=True)
    default_department = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        sync_users = kwargs.pop("sync_users", True)
        self.code = (self.code or "").strip().upper()
        super().save(*args, **kwargs)
        if sync_users:
            for user in User.objects.filter(role=self.code):
                apply_role_assignment(user, previous_role=user.role)

    def delete(self, *args, **kwargs):
        if User.objects.filter(role=self.code).exists():
            raise ProtectedError("This role is assigned to users and cannot be deleted.", [self])
        return super().delete(*args, **kwargs)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"
        MECHANIC = "MECHANIC", "Mechanic"
        CASHIER = "CASHIER", "Cashier"
        MANAGER = "MANAGER", "Manager"
        CUSTOMER = "CUSTOMER", "Customer"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    email = models.EmailField("email address", unique=True)
    email_verified = models.BooleanField(default=False)
    email_is_placeholder = models.BooleanField(default=False)
    phone = models.CharField(max_length=40, blank=True)
    photo = models.ImageField(upload_to="users/%Y/%m/", blank=True, validators=[validate_uploaded_image])
    department = models.CharField(max_length=80, blank=True)
    position = models.CharField(max_length=80, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return self.get_full_name() or self.username

    def save(self, *args, **kwargs):
        previous_role = None
        if self.pk:
            previous_role = type(self).objects.filter(pk=self.pk).values_list("role", flat=True).first()
        self.email = (self.email or "").strip()
        self.is_active = self.status == self.Status.ACTIVE
        super().save(*args, **kwargs)
        apply_role_assignment(self, previous_role=previous_role)
        self._sync_profile_identity()

    def _sync_profile_identity(self):
        full_name = self.get_full_name() or self.username
        Customer.objects.filter(user=self).update(
            name=full_name,
            email=self.email or "",
            phone=self.phone,
            photo=self.photo.name if self.photo else "",
            status=self.status,
        )
        Staff.objects.filter(user=self).update(
            position=self.position,
            status=self.status,
        )
        Mechanic.objects.filter(user=self).update(status=self.status)


def apply_user_identity(record, user):
    record.name = user.get_full_name() or user.username
    record.email = user.email or record.email
    record.phone = user.phone or record.phone
    if user.photo:
        record.photo = user.photo.name
    record.status = user.status
    return record


class Customer(models.Model):
    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="customer",
    )
    name = models.CharField(max_length=120)
    gender = models.CharField(max_length=20, choices=Gender.choices, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField()
    address = models.TextField(blank=True)
    photo = models.ImageField(upload_to="customers/%Y/%m/", blank=True, validators=[validate_uploaded_image])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    telegram_chat_id = models.CharField(
        max_length=64,
        blank=True,
        help_text="Telegram chat id for bot alerts (from Connect Telegram / Start).",
    )
    telegram_username = models.CharField(
        max_length=64,
        blank=True,
        help_text="Telegram @username captured when the customer linked the bot.",
    )
    telegram_alerts = models.BooleanField(
        default=True,
        help_text="When on, linked Telegram chats receive garage alerts.",
    )
    telegram_linked_at = models.DateTimeField(null=True, blank=True)
    telegram_connect_code = models.CharField(
        max_length=32,
        blank=True,
        db_index=True,
        help_text="One-time code embedded in t.me/Bot?start=… for linking.",
    )
    telegram_connect_expires = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["telegram_chat_id"],
                condition=~models.Q(telegram_chat_id=""),
                name="uniq_customer_telegram_chat_id",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.user_id:
            apply_user_identity(self, self.user)
        super().save(*args, **kwargs)


class Vehicle(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        IN_SHOP = "IN_SHOP", "In shop"
        INACTIVE = "INACTIVE", "Inactive"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="vehicles")
    plate = models.CharField(max_length=20, unique=True)
    brand = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    year = models.PositiveIntegerField()
    color = models.CharField(max_length=40, blank=True)
    vehicle_type = models.CharField(max_length=40, blank=True)
    vin = models.CharField(max_length=32, unique=True, null=True, blank=True)
    engine_number = models.CharField(max_length=40, blank=True)
    mileage = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    next_service_date = models.DateField(null=True, blank=True)
    next_service_mileage = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    image = models.ImageField(
        upload_to="vehicles/%Y/%m/",
        blank=True,
        validators=[validate_uploaded_image],
        help_text="JPG, PNG, WEBP, or GIF. 5 MB maximum.",
    )

    def __str__(self):
        return f"{self.plate} — {self.brand} {self.model}"


class ServiceCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    class Meta:
        verbose_name_plural = "service categories"

    def __str__(self):
        return self.name


class Service(models.Model):
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="services")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, default="ACTIVE")
    image = models.ImageField(
        upload_to="services/",
        blank=True,
        validators=[validate_uploaded_image],
        help_text="JPG, PNG, WEBP, or GIF. 5 MB maximum.",
    )

    def __str__(self):
        return self.name


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        WAITING = "WAITING", "Waiting"
        DIAGNOSING = "DIAGNOSING", "Inspection"
        WAITING_APPROVAL = "WAITING_APPROVAL", "Waiting for approval"
        REPAIRING = "REPAIRING", "Repairing"
        QUALITY_CHECK = "QUALITY_CHECK", "Quality check"
        READY_FOR_PICKUP = "READY_FOR_PICKUP", "Ready for pickup"
        CHECKED_IN = "CHECKED_IN", "Checked-in"
        IN_SERVICE = "IN_SERVICE", "In service"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="bookings")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="bookings")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="bookings")
    booking_date = models.DateField()
    booking_time = models.TimeField(null=True, blank=True)
    problem = models.TextField(blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    cancel_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cancelled_bookings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "booking"
        verbose_name_plural = "bookings"
        ordering = ["-booking_date", "-id"]

    def __str__(self):
        return f"{self.customer} / {self.vehicle} / {self.status}"


class BookingService(models.Model):
    """A service added onto a visit after the original booking."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="added_services")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="booking_additions")
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["booking", "service"], name="unique_service_on_visit"),
        ]
        ordering = ["id"]

    def __str__(self):
        return f"{self.booking_id} · {self.service}"


class Staff(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    POSITION_ROLE = {
        "Administrator": "ADMIN",
        "Manager": "MANAGER",
        "Front desk": "RECEPTIONIST",
        "Receptionist": "RECEPTIONIST",
        "Senior mechanic": "MECHANIC",
        "Mechanic": "MECHANIC",
        "Cashier": "CASHIER",
    }

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profile",
    )
    department = models.CharField(max_length=80, blank=True)
    position = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        verbose_name_plural = "staff"

    def __str__(self):
        return str(self.user)

    def save(self, *args, **kwargs):
        if self.user_id:
            user = self.user
            self.position = user.position
            self.status = user.status
        super().save(*args, **kwargs)
        if self.user_id:
            User.objects.filter(pk=self.user_id).update(department=self.department)


class Inspection(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CHECK_IN = "CHECK_IN", "Check-in"
        COMPLETED = "COMPLETED", "Completed"

    class Fuel(models.TextChoices):
        EMPTY = "0", "0%"
        QUARTER = "25", "25%"
        HALF = "50", "50%"
        THREE_QUARTER = "75", "75%"
        FULL = "100", "100%"

    repair_job = models.OneToOneField("RepairJob", on_delete=models.CASCADE, related_name="inspection")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    mileage = models.PositiveIntegerField(default=0)
    fuel_level = models.CharField(max_length=3, choices=Fuel.choices, blank=True)
    front_brake_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    rear_brake_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    tire_tread_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    condition = models.TextField(blank=True)
    damage = models.TextField(blank=True)
    note = models.TextField(blank=True)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    staff = models.ForeignKey(
        Staff,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inspections",
    )

    def __str__(self):
        return f"Inspection for WO-{self.repair_job_id:04d}"


class InspectionImage(models.Model):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        upload_to="inspections/%Y/%m/",
        validators=[validate_uploaded_image],
    )

    def __str__(self):
        return self.image.name


class Mechanic(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mechanic")
    skills = models.CharField(max_length=200, blank=True)
    specialization = models.CharField(max_length=120, blank=True)
    available = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return str(self.user)

    def save(self, *args, **kwargs):
        if self.user_id:
            self.status = self.user.status
        super().save(*args, **kwargs)


def role_codes(**flags):
    qs = Role.objects.all()
    for name, value in flags.items():
        qs = qs.filter(**{name: value})
    codes = tuple(qs.order_by("sort_order").values_list("code", flat=True))
    if codes:
        return codes
    if flags.get("in_customers"):
        return (User.Role.CUSTOMER,)
    if flags.get("in_technicians"):
        return (User.Role.MECHANIC,)
    if flags.get("in_staff"):
        return (
            User.Role.ADMIN,
            User.Role.MANAGER,
            User.Role.RECEPTIONIST,
            User.Role.MECHANIC,
            User.Role.CASHIER,
        )
    return tuple(item["code"] for item in DEFAULT_ROLES)


def role_choices():
    rows = list(
        Role.objects.filter(status=Role.Status.ACTIVE).order_by("sort_order", "name").values_list("code", "name")
    )
    if rows:
        return rows
    return [(item["code"], item["name"]) for item in DEFAULT_ROLES]


def role_display_name(code):
    if not code:
        return ""
    name = Role.objects.filter(code=code).values_list("name", flat=True).first()
    if name:
        return name
    mapping = {item["code"]: item["name"] for item in DEFAULT_ROLES}
    return mapping.get(code, code)


def current_customer_qs():
    return Customer.objects.filter(user__role__in=role_codes(in_customers=True))


def customer_has_history(customer):
    return (
        customer.vehicles.exists()
        or customer.bookings.exists()
        or customer.repair_jobs.exists()
        or customer.invoices.exists()
        or customer.payments.exists()
    )


def apply_role_assignment(user, previous_role=None):
    if not getattr(user, "pk", None):
        return
    try:
        role = Role.objects.filter(code=user.role).first()
    except (OperationalError, ProgrammingError):
        return
    in_customers = bool(role and role.in_customers)
    in_staff = bool(role and role.in_staff)
    in_technicians = bool(role and role.in_technicians)
    role_changed = previous_role != user.role

    updates = {}
    if role and role_changed:
        if in_staff or in_technicians:
            if role.default_position:
                updates["position"] = role.default_position
            if role.default_department:
                updates["department"] = role.default_department
            updates["is_staff"] = True
        if in_customers and not in_staff and not in_technicians:
            updates["position"] = ""
            updates["is_staff"] = False
    should_staff = in_staff or in_technicians or bool(user.is_superuser)
    if user.is_staff != should_staff:
        updates["is_staff"] = should_staff
    if user.is_superuser:
        updates["is_staff"] = True
    if updates:
        User.objects.filter(pk=user.pk).update(**updates)
        for key, value in updates.items():
            setattr(user, key, value)

    if in_customers:
        Customer.objects.get_or_create(
            user=user,
            defaults={
                "name": user.get_full_name() or user.username,
                "email": user.email or f"{user.username}@carsv.local",
                "phone": user.phone or "",
                "photo": user.photo.name if user.photo else "",
                "status": user.status,
            },
        )
    else:
        leftover = Customer.objects.filter(user=user).first()
        if leftover and not customer_has_history(leftover):
            leftover.delete()

    if in_staff:
        Staff.objects.get_or_create(
            user=user,
            defaults={
                "department": user.department,
                "position": user.position,
                "status": user.status,
            },
        )
    else:
        Staff.objects.filter(user=user).delete()

    if in_technicians:
        Mechanic.objects.get_or_create(
            user=user,
            defaults={"status": user.status, "available": True},
        )
    else:
        Mechanic.objects.filter(user=user).delete()


def verified_payment_total(invoice):
    """Sum of staff-verified payments only. Pending claims do not count."""
    if invoice is None:
        return Decimal("0")
    return invoice.payments.filter(status=Payment.Status.PAID).aggregate(total=Sum("amount"))["total"] or Decimal("0")


def claimed_payment_total(invoice, exclude_pk=None):
    """Pending + verified amounts reserved against the invoice balance."""
    if invoice is None:
        return Decimal("0")
    qs = invoice.payments.filter(status__in=(Payment.Status.PENDING, Payment.Status.PAID))
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")


def invoice_payment_state(invoice):
    """Customer-facing pay state: UNPAID, PENDING (awaiting verify), or PAID."""
    if invoice is None or invoice.status == Invoice.Status.CANCELLED:
        return "UNPAID"
    if invoice.status == Invoice.Status.PAID or verified_payment_total(invoice) >= invoice.grand_total:
        return "PAID"
    if invoice.payments.filter(status=Payment.Status.PENDING).exists():
        return "PENDING"
    return "UNPAID"


def refresh_invoice_status(invoice):
    """Set the invoice status from verified payments only."""
    if invoice is None or invoice.status == Invoice.Status.CANCELLED:
        return
    paid = verified_payment_total(invoice)
    if paid <= 0:
        new_status = Invoice.Status.DRAFT if invoice.status == Invoice.Status.DRAFT else Invoice.Status.UNPAID
    elif paid >= invoice.grand_total:
        new_status = Invoice.Status.PAID
    else:
        new_status = Invoice.Status.PARTIAL
    if invoice.status != new_status:
        Invoice.objects.filter(pk=invoice.pk).update(status=new_status)
        invoice.status = new_status


def next_payment_number():
    """PAY-0001 style id for new payment rows."""
    last = (
        Payment.objects.filter(number__startswith="PAY-")
        .order_by("-id")
        .values_list("number", flat=True)
        .first()
    )
    n = 1
    if last:
        try:
            n = int(str(last).split("-")[-1]) + 1
        except ValueError:
            n = Payment.objects.count() + 1
    while Payment.objects.filter(number=f"PAY-{n:04d}").exists():
        n += 1
    return f"PAY-{n:04d}"


def receipt_number_for(payment):
    """Receipt number is the payment id (PAY-0001)."""
    if payment is None:
        return ""
    number = (getattr(payment, "number", None) or "").strip()
    if number:
        return number
    if payment.pk:
        return f"PAY-{payment.pk:04d}"
    return ""


def next_receipt_number(payment=None):
    """Alias kept for callers — receipt uses the payment id."""
    return receipt_number_for(payment)


def verify_payment(payment, user=None):
    """Staff confirms a pending payment. Invoice balance updates from verified rows only."""
    if payment is None:
        raise ValidationError("That payment was not found.")
    if payment.status == Payment.Status.PAID:
        return payment
    if payment.status in (Payment.Status.FAILED, Payment.Status.REFUNDED):
        raise ValidationError("A failed or refunded payment cannot be verified.")
    if not payment.proof_image:
        raise ValidationError("Upload the payment proof (bill or transaction) before verifying.")
    if not payment.received_by_id:
        raise ValidationError("Select staff (Received by) before verifying this payment.")
    if payment.invoice_id and payment.customer_id != payment.invoice.customer_id:
        raise ValidationError("This payment customer does not match the invoice.")
    if payment.invoice_id and payment.vehicle_id and payment.vehicle_id != payment.invoice.vehicle_id:
        raise ValidationError("This payment vehicle does not match the invoice.")
    others = claimed_payment_total(payment.invoice, exclude_pk=payment.pk)
    remain = (payment.invoice.grand_total - others).quantize(Decimal("0.01"))
    amount = Decimal(payment.amount).quantize(Decimal("0.01"))
    if amount > remain:
        raise ValidationError(f"Amount is too much. Pay exactly ${remain} (you entered ${amount}).")
    if amount < remain:
        raise ValidationError(f"Amount is too little. Pay exactly ${remain} (you entered ${amount}).")
    payment.status = Payment.Status.PAID
    payment.receipt_number = receipt_number_for(payment)
    payment.verified_at = timezone.now()
    if user is not None and getattr(user, "is_authenticated", False):
        payment.verified_by = user
    payment.save()
    from django_app.telegram_bot import format_customer_alert, money_text

    method = payment.get_method_display()
    notify_customer(
        payment.customer,
        kind=Notification.Kind.PAYMENT,
        title=f"Payment accepted · {payment.number}",
        message=(
            f"Your {method.lower()} payment of {money_text(payment.amount)} "
            f"for {payment.invoice.number} was accepted."
        ),
        telegram_text=format_customer_alert(
            emoji="✅",
            title="Payment accepted",
            customer=payment.customer,
            fields=[
                f"🧾 Invoice: {payment.invoice.number}",
                f"🆔 Payment: {payment.number}",
                f"💵 Amount: {money_text(payment.amount)}",
                f"💳 Method: {method}",
            ],
            body="Your payment was accepted. Thank you!",
        ),
    )
    return payment


def reject_payment(payment, user=None, reason=""):
    """Staff rejects a pending claim. Does not change verified payments."""
    if payment is None:
        raise ValidationError("That payment was not found.")
    if payment.status != Payment.Status.PENDING:
        raise ValidationError("Only pending payments can be rejected.")
    payment.status = Payment.Status.FAILED
    if reason:
        note = (payment.reference or "").strip()
        payment.reference = f"{note} | rejected: {reason}".strip(" |")[:80] if note else f"rejected: {reason}"[:80]
    payment.verified_at = timezone.now()
    if user is not None and getattr(user, "is_authenticated", False):
        payment.verified_by = user
    payment.save()
    from django_app.telegram_bot import format_customer_alert

    notify_customer(
        payment.customer,
        kind=Notification.Kind.PAYMENT,
        title=f"Payment not accepted · {payment.number}",
        message=(
            f"The garage could not accept your payment for {payment.invoice.number}. "
            f"Please pay again or contact the front desk."
        ),
        telegram_text=format_customer_alert(
            emoji="❌",
            title="Payment not accepted",
            customer=payment.customer,
            fields=[
                f"🧾 Invoice: {payment.invoice.number}",
                f"🆔 Payment: {payment.number}",
            ],
            body=[
                "Sorry — the garage could not accept this payment.",
                "👉 Please try again, or contact the front desk.",
            ],
        ),
    )
    return payment


def withdraw_pending_payment(payment, customer=None):
    """Customer cancels a pending claim: delete row + proof file so admin no longer shows it."""
    if payment is None:
        raise ValidationError("That payment was not found.")
    if customer is not None and payment.customer_id != getattr(customer, "id", None):
        raise ValidationError("That payment was not found.")
    if payment.status != Payment.Status.PENDING:
        raise ValidationError("Only a pending payment can be withdrawn.")
    invoice = payment.invoice
    customer_row = payment.customer
    number = payment.number
    amount = payment.amount
    # Payment.delete() also removes the proof file from media storage.
    payment.delete()
    from django_app.telegram_bot import format_customer_alert, money_text

    notify_customer(
        customer_row,
        kind=Notification.Kind.PAYMENT,
        title=f"Payment withdrawn · {number}",
        message=(
            f"Your pending payment of {money_text(amount)} for {invoice.number} was cancelled. "
            f"You can submit a new payment."
        ),
        telegram_text=format_customer_alert(
            emoji="💳",
            title="Payment withdrawn",
            customer=customer_row,
            fields=[
                f"🧾 Invoice: {invoice.number}",
                f"🆔 Payment: {number}",
                f"💵 Amount: {money_text(amount)}",
            ],
            body=[
                "Your pending payment was cancelled.",
                "You can submit a new payment anytime.",
            ],
        ),
    )
    return invoice


def next_invoice_status(status):
    """Issue a draft invoice. Paid / partial status comes from recorded payments."""
    if status == Invoice.Status.DRAFT:
        return Invoice.Status.UNPAID
    return None


def visit_open_part_requests(job):
    """Part requests still on this visit that have not been issued from stock."""
    if job is None or not getattr(job, "pk", None):
        return PartRequest.objects.none()
    lookup = Q(repair_job=job)
    if job.booking_id:
        lookup |= Q(booking_id=job.booking_id)
    return (
        PartRequest.objects.filter(lookup, parts_usage__isnull=True)
        .exclude(status="CANCELLED")
        .select_related("spare_part")
        .distinct()
        .order_by("id")
    )


def sync_invoice_costs(job):
    """Keep the visit invoice in sync with booked services, issued parts, and open part requests."""
    if job is None or not getattr(job, "pk", None):
        return None
    invoice = Invoice.objects.filter(repair_job_id=job.pk).first()
    if invoice is None:
        invoice = ensure_visit_invoice(job)
        invoice = Invoice.objects.filter(repair_job_id=job.pk).first()
    if invoice is None or invoice.status == Invoice.Status.CANCELLED:
        return invoice
    issued = job.parts_used.aggregate(total=Sum("total"))["total"] or Decimal("0")
    pending = Decimal("0")
    for request_row in visit_open_part_requests(job):
        pending += Decimal(request_row.spare_part.unit_price or 0)
    invoice.parts_cost = issued + pending
    booking = job.booking if job.booking_id else None
    if booking is not None and not (booking.note or "").startswith("Opened from"):
        invoice.service_cost = visit_service_total(booking)
    invoice.save()
    refresh_invoice_status(invoice)
    return invoice


def ensure_default_roles():
    for item in DEFAULT_ROLES:
        if not Role.objects.filter(code=item["code"]).exists():
            Role(**item).save(sync_users=False)


class RepairJob(models.Model):
    class Status(models.TextChoices):
        WAITING = "WAITING", "Waiting"
        DIAGNOSING = "DIAGNOSING", "Inspection"
        WAITING_APPROVAL = "WAITING_APPROVAL", "Waiting for approval"
        REPAIRING = "REPAIRING", "Repairing"
        QUALITY_CHECK = "QUALITY_CHECK", "Quality check"
        READY_FOR_PICKUP = "READY_FOR_PICKUP", "Ready for pickup"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="repair_job")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="repair_jobs")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="repair_jobs")
    mechanic = models.ForeignKey(
        Mechanic, null=True, blank=True, on_delete=models.SET_NULL, related_name="repair_jobs"
    )
    problem = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    estimated_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.WAITING)
    progress = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "work order"
        verbose_name_plural = "work orders"

    def __str__(self):
        return f"Job {self.id} — {self.vehicle}"

    def save(self, *args, **kwargs):
        self.progress = progress_for_job_status(self.status)
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"progress"}
        super().save(*args, **kwargs)
        if self.status == RepairJob.Status.DIAGNOSING:
            ensure_job_inspection(self)
        if self.status == RepairJob.Status.WAITING_APPROVAL:
            ensure_visit_invoice(self)
        sync_booking_from_job(self)


class SparePartCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    class Meta:
        verbose_name_plural = "spare part categories"

    def __str__(self):
        return self.name


class SparePart(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    part_number = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    category = models.ForeignKey(SparePartCategory, on_delete=models.PROTECT, related_name="parts")
    brand = models.CharField(max_length=80, blank=True)
    image = models.ImageField(upload_to="parts/%Y/%m/", blank=True, validators=[validate_uploaded_image])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.part_number} — {self.name}"


class PartsUsage(models.Model):
    repair_job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name="parts_used")
    spare_part = models.ForeignKey(SparePart, on_delete=models.PROTECT, related_name="usages")
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        Staff,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="parts_recorded",
    )
    stock_applied = models.BooleanField(default=False)

    def clean(self):
        super().clean()
        if not self.spare_part_id or not self.quantity:
            return
        available = SparePart.objects.filter(pk=self.spare_part_id).values_list("quantity", flat=True).first() or 0
        needed = self.quantity
        if self.pk:
            previous = PartsUsage.objects.filter(pk=self.pk).values("quantity", "spare_part_id", "stock_applied").first()
            if previous and previous["spare_part_id"] == self.spare_part_id:
                if previous["stock_applied"]:
                    available += previous["quantity"]
                else:
                    needed = max(self.quantity - previous["quantity"], 0)
        if needed > available:
            raise ValidationError({"quantity": "That quantity is more than the stock on hand."})

    def save(self, *args, **kwargs):
        self.total = Decimal(self.unit_price or 0) * self.quantity
        with transaction.atomic():
            part = SparePart.objects.select_for_update().get(pk=self.spare_part_id)
            if self._state.adding:
                if self.quantity > part.quantity:
                    raise ValidationError({"quantity": "That quantity is more than the stock on hand."})
                SparePart.objects.filter(pk=part.pk).update(quantity=F("quantity") - self.quantity)
                self.stock_applied = True
            else:
                previous = (
                    PartsUsage.objects.select_for_update()
                    .filter(pk=self.pk)
                    .values("quantity", "spare_part_id", "stock_applied")
                    .first()
                )
                if previous and previous["stock_applied"]:
                    if previous["spare_part_id"] != part.pk:
                        SparePart.objects.filter(pk=previous["spare_part_id"]).update(quantity=F("quantity") + previous["quantity"])
                        if self.quantity > part.quantity:
                            raise ValidationError({"quantity": "That quantity is more than the stock on hand."})
                        SparePart.objects.filter(pk=part.pk).update(quantity=F("quantity") - self.quantity)
                    else:
                        delta = self.quantity - previous["quantity"]
                        if delta > part.quantity:
                            raise ValidationError({"quantity": "That quantity is more than the stock on hand."})
                        if delta:
                            SparePart.objects.filter(pk=part.pk).update(quantity=F("quantity") - delta)
                elif previous:
                    extra = self.quantity - previous["quantity"]
                    if extra > 0:
                        if extra > part.quantity:
                            raise ValidationError({"quantity": "That quantity is more than the stock on hand."})
                        SparePart.objects.filter(pk=part.pk).update(quantity=F("quantity") - extra)
            super().save(*args, **kwargs)
            if not getattr(self, "_skip_invoice_sync", False):
                sync_invoice_costs(self.repair_job)

    def delete(self, *args, **kwargs):
        job = self.repair_job
        with transaction.atomic():
            if self.stock_applied and self.spare_part_id:
                SparePart.objects.filter(pk=self.spare_part_id).update(quantity=F("quantity") + self.quantity)
            result = super().delete(*args, **kwargs)
        if not getattr(self, "_skip_invoice_sync", False):
            sync_invoice_costs(job)
        return result

    def __str__(self):
        return f"{self.spare_part} x{self.quantity}"


class PartRequest(models.Model):
    """A customer asking the garage for a part that is already on the shelf."""

    class Fulfillment(models.TextChoices):
        INSTALL = "INSTALL_IN_WORKSHOP", "Workshop install"
        PICKUP = "PICKUP_AT_COUNTER", "Counter pickup"
        DELIVERY = "DELIVERY", "Delivery"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        NOTED = "NOTED", "Noted by the garage"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"

    number = models.CharField(max_length=40, unique=True, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="part_requests")
    vehicle = models.ForeignKey(
        Vehicle, null=True, blank=True, on_delete=models.SET_NULL, related_name="part_requests"
    )
    spare_part = models.ForeignKey(SparePart, on_delete=models.PROTECT, related_name="requests")
    booking = models.ForeignKey(
        Booking, null=True, blank=True, on_delete=models.SET_NULL, related_name="part_requests"
    )
    repair_job = models.ForeignKey(
        "RepairJob", null=True, blank=True, on_delete=models.SET_NULL, related_name="part_requests"
    )
    parts_usage = models.OneToOneField(
        "PartsUsage", null=True, blank=True, on_delete=models.SET_NULL, related_name="part_request"
    )
    fulfillment = models.CharField(max_length=32, choices=Fulfillment.choices, default=Fulfillment.INSTALL)
    notes = models.TextField(blank=True)
    cancel_reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def clean(self):
        super().clean()
        if self.fulfillment == self.Fulfillment.INSTALL and not self.booking_id:
            raise ValidationError(
                {"booking": "Workshop install parts belong on a booking (visit quote)."}
            )
        if self.booking_id:
            if self.customer_id and self.customer_id != self.booking.customer_id:
                raise ValidationError({"customer": "Customer must match the booking customer."})
            if self.vehicle_id and self.vehicle_id != self.booking.vehicle_id:
                raise ValidationError({"vehicle": "Vehicle must match the booking vehicle."})
            try:
                job = self.booking.repair_job
            except RepairJob.DoesNotExist:
                job = None
            if self.repair_job_id and job is not None and self.repair_job_id != job.pk:
                raise ValidationError({"repair_job": "Work order must match the booking’s work order."})

    def save(self, *args, **kwargs):
        if self.fulfillment in (self.Fulfillment.PICKUP, self.Fulfillment.DELIVERY):
            self.booking_id = None
        if self.booking_id:
            if not self.customer_id or self.customer_id != self.booking.customer_id:
                self.customer_id = self.booking.customer_id
            if not self.vehicle_id or self.vehicle_id != self.booking.vehicle_id:
                self.vehicle_id = self.booking.vehicle_id
            try:
                job = self.booking.repair_job
            except RepairJob.DoesNotExist:
                job = None
            if job is not None and (not self.repair_job_id or self.repair_job_id != job.pk):
                self.repair_job_id = job.pk
        super().save(*args, **kwargs)
        if not self.number:
            assigned = f"PR-{self.pk:04d}"
            type(self).objects.filter(pk=self.pk).update(number=assigned)
            self.number = assigned

    def __str__(self):
        return self.number or f"Part request {self.pk}"


PART_REQUEST_STAGES = (
    PartRequest.Status.PENDING,
    PartRequest.Status.NOTED,
    PartRequest.Status.CONFIRMED,
)

BOOKING_STATUS_ORDER = {
    Booking.Status.PENDING: 0,
    Booking.Status.CONFIRMED: 1,
    Booking.Status.WAITING: 2,
    Booking.Status.CHECKED_IN: 2,
    Booking.Status.DIAGNOSING: 3,
    Booking.Status.WAITING_APPROVAL: 4,
    Booking.Status.REPAIRING: 5,
    Booking.Status.IN_SERVICE: 5,
    Booking.Status.QUALITY_CHECK: 6,
    Booking.Status.READY_FOR_PICKUP: 7,
    Booking.Status.COMPLETED: 8,
    Booking.Status.CANCELLED: 9,
}


def next_part_request_status(status):
    """Next garage action on a part request (same style as work-order advance)."""
    try:
        index = PART_REQUEST_STAGES.index(status)
    except ValueError:
        return None
    if index + 1 >= len(PART_REQUEST_STAGES):
        return None
    return PART_REQUEST_STAGES[index + 1]


def booking_blocking_part_requests(booking):
    """Pending or noted part requests must be confirmed or cancelled before the booking is accepted."""
    if booking is None or not getattr(booking, "pk", None):
        return PartRequest.objects.none()
    return booking.part_requests.filter(
        status__in=(PartRequest.Status.PENDING, PartRequest.Status.NOTED)
    ).select_related("spare_part")


def job_blocking_part_requests(job):
    """Pending or noted parts on this visit (booking or quote) block finishing the repair."""
    if job is None or not getattr(job, "pk", None):
        return PartRequest.objects.none()
    lookup = Q(repair_job=job)
    if job.booking_id:
        lookup |= Q(booking_id=job.booking_id)
    return (
        PartRequest.objects.filter(
            lookup,
            status__in=(PartRequest.Status.PENDING, PartRequest.Status.NOTED),
        )
        .select_related("spare_part")
        .distinct()
    )


def booking_can_confirm(booking):
    """Accept a pending booking only when every part request is confirmed or cancelled."""
    if booking is None or booking.status != Booking.Status.PENDING:
        return False
    if linked_job(booking) is not None:
        return False
    return not booking_blocking_part_requests(booking).exists()


def cancel_part_request(part_request, reason="", user=None):
    """Cancel a part request that cannot be issued (for example out of stock)."""
    if part_request is None:
        raise ValidationError("That part request was not found.")
    if part_request.parts_usage_id:
        raise ValidationError("This part is already issued, so it cannot be cancelled here.")
    if part_request.status == PartRequest.Status.CANCELLED:
        return part_request
    text = (reason or "").strip()
    if not text:
        raise ValidationError({"cancel_reason": "Say why this part request was cancelled."})
    part_request.status = PartRequest.Status.CANCELLED
    part_request.cancel_reason = text
    part_request.save(update_fields=["status", "cancel_reason"])
    job = part_request.repair_job
    if job is None and part_request.booking_id:
        try:
            job = part_request.booking.repair_job
        except RepairJob.DoesNotExist:
            job = None
    if job is not None:
        sync_invoice_costs(job)
    from django_app.telegram_bot import format_customer_alert

    part_name = part_request.spare_part.name if part_request.spare_part_id else "Part"
    notify_customer(
        part_request.customer_id,
        kind=Notification.Kind.INVOICE,
        title=f"{part_request.number} cancelled",
        message=f"{part_name} was cancelled on your visit. Reason: {text}",
        telegram_text=format_customer_alert(
            emoji="📦",
            title="Part cancelled",
            customer=part_request.customer,
            fields=[
                f"📦 Part: {part_name}",
                f"🆔 Request: {part_request.number}",
                f"Reason: {text}",
            ],
            body=[
                "This part was cancelled on your visit.",
                "Message the garage if you still need it.",
            ],
        ),
    )
    return part_request


def advance_part_request(part_request, user=None):
    """Move a part request one step: Pending → Noted → Confirmed (issues stock when possible)."""
    if part_request is None:
        raise ValidationError("That part request was not found.")
    if part_request.status == PartRequest.Status.CANCELLED:
        raise ValidationError("This part request was cancelled.")
    nxt = next_part_request_status(part_request.status)
    if not nxt:
        raise ValidationError("This part request is already complete.")
    if nxt == PartRequest.Status.NOTED:
        part_request.status = PartRequest.Status.NOTED
        part_request.save(update_fields=["status"])
        return part_request
    return confirm_part_request(part_request, user=user)


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        UNPAID = "UNPAID", "Unpaid"
        PARTIAL = "PARTIAL", "Partially paid"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="invoices")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="invoices")
    repair_job = models.OneToOneField(RepairJob, on_delete=models.CASCADE, related_name="invoice")
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    parts_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)

    def clean(self):
        super().clean()
        if not self.repair_job_id:
            return
        job = self.repair_job
        if self.customer_id and self.customer_id != job.customer_id:
            raise ValidationError({"customer": "Customer must match the repair job customer."})
        if self.vehicle_id and self.vehicle_id != job.vehicle_id:
            raise ValidationError({"vehicle": "Vehicle must match the repair job vehicle."})

    def save(self, *args, **kwargs):
        if self.repair_job_id:
            if not self.customer_id or self.customer_id != self.repair_job.customer_id:
                self.customer_id = self.repair_job.customer_id
            if not self.vehicle_id or self.vehicle_id != self.repair_job.vehicle_id:
                self.vehicle_id = self.repair_job.vehicle_id
        labor = Decimal(self.labor_cost or 0)
        service = Decimal(self.service_cost or 0)
        parts = Decimal(self.parts_cost or 0)
        discount = Decimal(self.discount or 0)
        tax = Decimal(self.tax or 0)
        self.subtotal = labor + service + parts
        self.grand_total = self.subtotal - discount + tax
        super().save(*args, **kwargs)

    def __str__(self):
        return self.number


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank transfer"
        CARD = "CARD", "Card"
        QR = "QR", "QR"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    number = models.CharField(max_length=40, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="payments")
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
        help_text="Taken from the invoice vehicle.",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    paid_at = models.DateField()
    reference = models.CharField(max_length=80, blank=True)
    proof_image = models.ImageField(
        upload_to="payments/%Y/%m/",
        blank=True,
        validators=[validate_uploaded_image],
        help_text="Cash bill or digital transaction screenshot. Required before Verify.",
    )
    received_by = models.ForeignKey(
        Staff,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payments_taken",
        help_text="Staff who received the payment. Required before Verify.",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    receipt_number = models.CharField(max_length=40, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payments_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        super().clean()
        if not self.invoice_id or self.amount is None:
            return
        if self.invoice_id and self.customer_id and self.customer_id != self.invoice.customer_id:
            raise ValidationError({"customer": "Customer must match the invoice customer."})
        if self.invoice_id and self.vehicle_id and self.vehicle_id != self.invoice.vehicle_id:
            raise ValidationError({"vehicle": "Vehicle must match the invoice vehicle."})
        if self.status in (self.Status.FAILED, self.Status.REFUNDED):
            return
        already = claimed_payment_total(self.invoice, exclude_pk=self.pk)
        remain = (self.invoice.grand_total - already).quantize(Decimal("0.01"))
        amount = Decimal(self.amount).quantize(Decimal("0.01"))
        if amount > remain:
            raise ValidationError(
                {"amount": f"Amount is too much. Pay exactly ${remain} (you entered ${amount})."}
            )
        if amount < remain:
            raise ValidationError(
                {"amount": f"Amount is too little. Pay exactly ${remain} (you entered ${amount})."}
            )
        if self.status == self.Status.PAID and not self.proof_image and not self.pk:
            raise ValidationError({"proof_image": "Upload payment proof before marking Paid."})
        if self.status == self.Status.PAID and not self.received_by_id:
            raise ValidationError({"received_by": "Select staff (Received by) before marking Paid."})

    def save(self, *args, **kwargs):
        if self.invoice_id:
            if not self.customer_id or self.customer_id != self.invoice.customer_id:
                self.customer_id = self.invoice.customer_id
            if not self.vehicle_id or self.vehicle_id != self.invoice.vehicle_id:
                self.vehicle_id = self.invoice.vehicle_id
        super().save(*args, **kwargs)
        refresh_invoice_status(self.invoice)

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        proof_name = ""
        storage = None
        if self.proof_image:
            try:
                proof_name = self.proof_image.name
                storage = self.proof_image.storage
            except (ValueError, AttributeError):
                proof_name = ""
                storage = None
        result = super().delete(*args, **kwargs)
        if proof_name and storage is not None:
            try:
                storage.delete(proof_name)
            except Exception:
                pass
        refresh_invoice_status(invoice)
        return result

    def __str__(self):
        return self.number


class Estimate(models.Model):
    """Customer quotation. Staff create it; the customer can approve or reject it."""

    class Status(models.TextChoices):
        SENT = "SENT", "Sent"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="estimates")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="estimates")
    repair_job = models.ForeignKey(
        RepairJob, null=True, blank=True, on_delete=models.SET_NULL, related_name="estimates"
    )
    description = models.TextField(blank=True)
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    parts_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)
    decision_note = models.TextField(blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        creating = self._state.adding
        previous = None
        if self.pk:
            previous = type(self).objects.filter(pk=self.pk).values_list("status", flat=True).first()
        super().save(*args, **kwargs)
        total = (
            Decimal(self.labor_cost or 0)
            + Decimal(self.service_cost or 0)
            + Decimal(self.parts_cost or 0)
            - Decimal(self.discount or 0)
            + Decimal(self.tax or 0)
        )
        plate = self.vehicle.plate if self.vehicle_id else "your vehicle"
        from django_app.telegram_bot import format_customer_alert, money_text

        if creating and self.status == self.Status.SENT:
            notify_customer(
                self.customer_id,
                kind=Notification.Kind.QUOTE,
                title=f"Quote {self.number}",
                message=(
                    f"A quotation for {plate} is ready ({money_text(total)}). "
                    "Open Quotes to approve or decline."
                ),
                telegram_text=format_customer_alert(
                    emoji="📋",
                    title="Quote ready",
                    customer=self.customer,
                    fields=[
                        f"🚗 Car: {plate}",
                        f"🧾 Quote: {self.number}",
                        f"💵 Amount: {money_text(total)}",
                    ],
                    body=[
                        "Please review the price before we continue.",
                        "👉 Open Quotes to approve or decline.",
                    ],
                ),
            )
        elif previous == self.Status.SENT and self.status == self.Status.APPROVED:
            notify_customer(
                self.customer_id,
                kind=Notification.Kind.QUOTE,
                title=f"Quote {self.number} approved",
                message=f"You approved the quotation for {plate}. The workshop can continue.",
                telegram_text=format_customer_alert(
                    emoji="✅",
                    title="Quote approved",
                    customer=self.customer,
                    fields=[
                        f"🚗 Car: {plate}",
                        f"🧾 Quote: {self.number}",
                    ],
                    body="Thanks — you approved the quote. We’ll continue the work.",
                ),
            )
        elif previous == self.Status.SENT and self.status == self.Status.REJECTED:
            notify_customer(
                self.customer_id,
                kind=Notification.Kind.QUOTE,
                title=f"Quote {self.number} declined",
                message=f"You declined the quotation for {plate}. Contact the garage if you need changes.",
                telegram_text=format_customer_alert(
                    emoji="📋",
                    title="Quote declined",
                    customer=self.customer,
                    fields=[
                        f"🚗 Car: {plate}",
                        f"🧾 Quote: {self.number}",
                    ],
                    body=[
                        "You declined this quote. We won’t continue with that price.",
                        "Contact the garage if you’d like a different option.",
                    ],
                ),
            )


class Notification(models.Model):
    class Kind(models.TextChoices):
        BOOKING = "BOOKING", "Booking"
        REPAIR = "REPAIR", "Repair"
        INVOICE = "INVOICE", "Invoice"
        PAYMENT = "PAYMENT", "Payment"
        QUOTE = "QUOTE", "Quotation"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        ACCOUNT = "ACCOUNT", "Account"
        VEHICLE = "VEHICLE", "Vehicle"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.BOOKING)
    title = models.CharField(max_length=160)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    telegram_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title


def notify_customer(customer, *, kind, title, message, telegram=True, in_app=True, telegram_text=None):
    """
    Create an in-app notification and optionally push an alert to Telegram.
    Prefer this over Notification.objects.create for customer-facing events.

    telegram_text: full customer-facing Telegram body (emoji layout). When set,
    Telegram uses it; in-app still uses title + message.

    Telegram HTTP runs after DB commit so SQLite is not held locked during the
    network call (avoids "database is locked" with the Telegram poller).
    """
    if isinstance(customer, int):
        customer = Customer.objects.filter(pk=customer).first()
    if customer is None or not getattr(customer, "pk", None):
        return None
    note = None
    if in_app:
        note = Notification.objects.create(
            customer=customer,
            kind=kind,
            title=(title or "")[:160],
            message=message or "",
        )
    if telegram:
        customer_pk = customer.pk
        note_pk = note.pk if note is not None else None
        title_s = title
        message_s = message
        telegram_text_s = telegram_text

        def _deliver_after_commit():
            try:
                from django_app.telegram_bot import deliver_telegram

                cust = Customer.objects.filter(pk=customer_pk).first()
                if cust is None:
                    return
                sent = deliver_telegram(
                    cust, title_s, message_s, telegram_text=telegram_text_s
                )
                if sent and note_pk:
                    Notification.objects.filter(pk=note_pk).update(telegram_sent=True)
            except Exception:
                import logging

                logging.getLogger(__name__).exception(
                    "Telegram deliver failed for customer %s", customer_pk
                )

        transaction.on_commit(_deliver_after_commit)
    return note


class BlogPost(models.Model):
    """Public workshop article. Drafts stay off the website until published."""

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=180, unique=True)
    category = models.CharField(max_length=80)
    excerpt = models.TextField()
    body = models.TextField(help_text="Separate paragraphs with a blank line.")
    tips = models.TextField(blank=True, help_text="One tip per line.")
    author_name = models.CharField(max_length=120, default="CarSV Workshop")
    image = models.ImageField(
        upload_to="blog/",
        blank=True,
        validators=[validate_uploaded_image],
        help_text="JPG, PNG, WEBP, or GIF. 5 MB maximum.",
    )
    featured = models.BooleanField(default=False)
    read_minutes = models.PositiveIntegerField(default=4)
    published = models.BooleanField(default=False)
    published_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-featured", "-published_at", "-id"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.published and not self.published_at:
            self.published_at = timezone.localdate()
        super().save(*args, **kwargs)


class AuthProvider(models.Model):
    """Google or Telegram identity linked to one local user. Not merged by email."""

    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"
        TELEGRAM = "telegram", "Telegram"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="auth_providers",
    )
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["provider", "provider_user_id"], name="unique_provider_identity"),
            models.UniqueConstraint(fields=["user", "provider"], name="unique_user_provider"),
        ]

    def __str__(self):
        return f"{self.provider}:{self.provider_user_id}"


class TelegramLinkPending(models.Model):
    """Temporary Yes/No confirmation after a customer shares their phone in the bot."""

    chat_id = models.CharField(max_length=64, unique=True, db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="telegram_link_pending")
    telegram_username = models.CharField(max_length=64, blank=True)
    phone_digits = models.CharField(max_length=32, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"pending {self.chat_id} → customer {self.customer_id}"


JOB_STAGES = (
    RepairJob.Status.WAITING,
    RepairJob.Status.DIAGNOSING,
    RepairJob.Status.WAITING_APPROVAL,
    RepairJob.Status.REPAIRING,
    RepairJob.Status.QUALITY_CHECK,
    RepairJob.Status.READY_FOR_PICKUP,
    RepairJob.Status.COMPLETED,
)


def next_job_status(status):
    """The next workshop stage."""
    try:
        index = JOB_STAGES.index(status)
    except ValueError:
        return None
    if index + 1 >= len(JOB_STAGES):
        return None
    return JOB_STAGES[index + 1]


def progress_for_job_status(status):
    """The tracking steps, from a waiting visit at 0% to a finished visit at 100%."""
    return {
        RepairJob.Status.WAITING: 0,
        RepairJob.Status.DIAGNOSING: 20,
        RepairJob.Status.WAITING_APPROVAL: 40,
        RepairJob.Status.REPAIRING: 60,
        RepairJob.Status.QUALITY_CHECK: 80,
        RepairJob.Status.READY_FOR_PICKUP: 90,
        RepairJob.Status.COMPLETED: 100,
        RepairJob.Status.CANCELLED: 40,
    }.get(status, 0)


LATER_THAN_INSPECTION = (
    RepairJob.Status.WAITING_APPROVAL,
    RepairJob.Status.REPAIRING,
    RepairJob.Status.QUALITY_CHECK,
    RepairJob.Status.READY_FOR_PICKUP,
    RepairJob.Status.COMPLETED,
)

CUSTOMER_CONFIRMS = (
    RepairJob.Status.REPAIRING,
    RepairJob.Status.QUALITY_CHECK,
    RepairJob.Status.READY_FOR_PICKUP,
    RepairJob.Status.COMPLETED,
)


def job_inspection(job):
    if job is None or not getattr(job, "pk", None):
        return None
    try:
        return job.inspection
    except Inspection.DoesNotExist:
        return None


def inspection_fields_filled(inspection):
    """Every inspection input is present: measures, text, inspector, and at least one photo."""
    if inspection is None:
        return False
    if not inspection.staff_id:
        return False
    if not (inspection.fuel_level or "").strip():
        return False
    if inspection.mileage is None:
        return False
    if inspection.front_brake_mm is None:
        return False
    if inspection.rear_brake_mm is None:
        return False
    if inspection.tire_tread_mm is None:
        return False
    if not (inspection.condition or "").strip():
        return False
    if not (inspection.damage or "").strip():
        return False
    if not (inspection.note or "").strip():
        return False
    if not inspection.images.exists():
        return False
    return True


def inspection_missing_fields(inspection):
    """Short labels for empty inspection inputs (for admin messages)."""
    if inspection is None:
        return ["inspection"]
    missing = []
    if inspection.mileage is None:
        missing.append("mileage")
    if not (inspection.fuel_level or "").strip():
        missing.append("fuel level")
    if inspection.front_brake_mm is None:
        missing.append("front brake")
    if inspection.rear_brake_mm is None:
        missing.append("rear brake")
    if inspection.tire_tread_mm is None:
        missing.append("tire tread")
    if not inspection.staff_id:
        missing.append("inspector")
    if not (inspection.condition or "").strip():
        missing.append("condition")
    if not (inspection.damage or "").strip():
        missing.append("damage")
    if not (inspection.note or "").strip():
        missing.append("note")
    if not inspection.images.exists():
        missing.append("photos")
    return missing


def inspection_is_complete(job):
    """Inspection finished, inspector assigned, and every field filled."""
    inspection = job_inspection(job)
    return (
        inspection is not None
        and inspection.status == Inspection.Status.COMPLETED
        and inspection_fields_filled(inspection)
    )


def inspection_has_staff(job):
    inspection = job_inspection(job)
    return inspection is not None and bool(inspection.staff_id)


INSPECTION_STAGES = (
    Inspection.Status.PENDING,
    Inspection.Status.CHECK_IN,
    Inspection.Status.COMPLETED,
)


def next_inspection_status(status):
    """The next inspection stage on the admin advance button."""
    try:
        index = INSPECTION_STAGES.index(status)
    except ValueError:
        return None
    if index + 1 >= len(INSPECTION_STAGES):
        return None
    return INSPECTION_STAGES[index + 1]


def customer_must_confirm(job, new_status):
    """Repairing and every later stage wait for the customer quote, not the work-order button."""
    previous = job.status if getattr(job, "pk", None) else ""
    return previous == RepairJob.Status.WAITING_APPROVAL and new_status in CUSTOMER_CONFIRMS


def job_advance_block_reason(job, new_status):
    """Why the work order cannot move to new_status, or empty when allowed."""
    if job is None:
        return "That work order was not found."
    previous = job.status if getattr(job, "pk", None) else ""
    if previous == RepairJob.Status.CANCELLED:
        return "This work order is cancelled." if new_status != RepairJob.Status.CANCELLED else ""
    if new_status == RepairJob.Status.CANCELLED:
        return "Cancel the booking instead of skipping the work order to Cancelled."
    if customer_must_confirm(job, new_status):
        return "The customer confirms this repair on the quote page. This work order cannot skip that."
    # Waiting → Inspection still needs a technician on the job.
    if new_status == RepairJob.Status.DIAGNOSING and not job.mechanic_id:
        return "Assign a technician before starting inspection."
    # Finish repairing → Quality check only when every part request is confirmed or cancelled.
    if new_status == RepairJob.Status.QUALITY_CHECK and job_blocking_part_requests(job).exists():
        return "Confirm or cancel every part request before Quality check."
    # Quality check → Ready for pickup only when the linked invoice is fully paid (verified).
    if new_status == RepairJob.Status.READY_FOR_PICKUP:
        try:
            invoice = job.invoice
        except Invoice.DoesNotExist:
            invoice = None
        if invoice is None or invoice.status == Invoice.Status.CANCELLED:
            return "Issue and collect payment on the invoice before Ready for pickup."
        refresh_invoice_status(invoice)
        state = invoice_payment_state(invoice)
        if state == "UNPAID":
            return "Customer has not paid this invoice yet."
        if state == "PENDING":
            return "Payment is waiting for verification."
        if invoice.status != Invoice.Status.PAID:
            return "Invoice must be fully paid before Ready for pickup."
    if new_status not in LATER_THAN_INSPECTION:
        return ""
    if previous in LATER_THAN_INSPECTION:
        return ""
    if not job.mechanic_id:
        return "Assign a technician before moving past inspection."
    inspection = job_inspection(job)
    if inspection is None:
        return "Start the inspection and assign an inspector before Waiting for approval."
    if not inspection.staff_id:
        return "Select the inspector on the inspection before Waiting for approval."
    if not inspection_fields_filled(inspection):
        return "Fill every inspection field (including photos) before Waiting for approval."
    if inspection.status != Inspection.Status.COMPLETED:
        return "Complete the inspection before moving this work order to Waiting for approval."
    return ""


def job_can_reach(job, new_status):
    """Waiting for approval needs a technician, an inspector, and a completed inspection."""
    return not job_advance_block_reason(job, new_status)


def ensure_job_inspection(job, user=None):
    """An inspection belongs to one work order. Starts Pending until an inspector is assigned."""
    if job is None or not job.pk:
        return None
    existing = job_inspection(job)
    if existing is not None:
        return existing
    return Inspection.objects.create(
        repair_job=job,
        mileage=(job.vehicle.mileage if job.vehicle_id else 0) or 0,
        status=Inspection.Status.PENDING,
        staff=None,
    )


OPEN_VISIT = (
    Booking.Status.PENDING,
    Booking.Status.CONFIRMED,
    Booking.Status.WAITING,
    Booking.Status.DIAGNOSING,
    Booking.Status.WAITING_APPROVAL,
    Booking.Status.REPAIRING,
    Booking.Status.QUALITY_CHECK,
    Booking.Status.READY_FOR_PICKUP,
    Booking.Status.CHECKED_IN,
    Booking.Status.IN_SERVICE,
)

SHOP_BOOKING = (
    Booking.Status.DIAGNOSING,
    Booking.Status.WAITING_APPROVAL,
    Booking.Status.REPAIRING,
    Booking.Status.QUALITY_CHECK,
    Booking.Status.READY_FOR_PICKUP,
    Booking.Status.CHECKED_IN,
    Booking.Status.IN_SERVICE,
)


def booking_slot_taken(vehicle, booking_date, booking_time, ignore_pk=None):
    """The same car cannot hold two open visits at the same date and time."""
    if vehicle is None or booking_date is None:
        return False
    matches = Booking.objects.filter(vehicle=vehicle, booking_date=booking_date).exclude(
        status=Booking.Status.CANCELLED
    )
    if booking_time:
        matches = matches.filter(booking_time=booking_time)
    else:
        matches = matches.filter(booking_time__isnull=True)
    if ignore_pk:
        matches = matches.exclude(pk=ignore_pk)
    return matches.exists()


def sync_vehicle_shop_status(vehicle):
    """A car is in the shop while it has an open job or a checked-in visit."""
    if vehicle is None or vehicle.status == Vehicle.Status.INACTIVE:
        return
    in_shop = vehicle.repair_jobs.exclude(
        status__in=(RepairJob.Status.COMPLETED, RepairJob.Status.WAITING, RepairJob.Status.CANCELLED)
    ).exists() or vehicle.bookings.filter(status__in=SHOP_BOOKING).exists()
    new_status = Vehicle.Status.IN_SHOP if in_shop else Vehicle.Status.ACTIVE
    if vehicle.status != new_status:
        Vehicle.objects.filter(pk=vehicle.pk).update(status=new_status)
        vehicle.status = new_status


def open_visit_for(customer, vehicle):
    """The visit this car is already booked on, if it is still open."""
    if customer is None or vehicle is None:
        return None
    return (
        Booking.objects.filter(customer=customer, vehicle=vehicle, status__in=OPEN_VISIT)
        .order_by("-booking_date", "-id")
        .first()
    )


def visit_service_total(booking):
    total = Decimal(booking.service.price or 0) if booking.service_id else Decimal("0")
    extra = booking.added_services.aggregate(total=Sum("price"))["total"] or Decimal("0")
    return total + Decimal(extra)


def add_booking_service(booking, service):
    """Keep an extra service on the same visit. A closed visit is left unchanged."""
    if booking.status in (Booking.Status.COMPLETED, Booking.Status.CANCELLED):
        raise ValidationError({"service": "This visit is already closed."})
    if service.status != "ACTIVE":
        raise ValidationError({"service": "This service is not available."})
    if booking.service_id == service.id or booking.added_services.filter(service=service).exists():
        raise ValidationError({"service": "That service is already on this visit."})
    row = BookingService.objects.create(booking=booking, service=service, price=service.price)
    try:
        invoice = booking.repair_job.invoice
    except (RepairJob.DoesNotExist, Invoice.DoesNotExist):
        invoice = None
    if invoice is not None and invoice.status != Invoice.Status.CANCELLED:
        invoice.service_cost = Decimal(invoice.service_cost or 0) + row.price
        invoice.save()
        refresh_invoice_status(invoice)
    from django_app.telegram_bot import booking_detail_fields, format_customer_alert

    plate = booking.vehicle.plate if booking.vehicle_id else "your car"
    notify_customer(
        booking.customer_id,
        kind=Notification.Kind.BOOKING,
        title="Service added to your visit",
        message=f"{service.name} was added to your visit for {plate}.",
        telegram_text=format_customer_alert(
            emoji="🔧",
            title="Service added",
            customer=booking.customer,
            fields=booking_detail_fields(booking) + [f"✏️ Added: {service.name}"],
            body="This service was added to your current visit.",
        ),
    )
    return row


def visit_quote_is_open(booking):
    """Customer may still change extras and pending parts on the quote."""
    return booking is not None and booking.status == Booking.Status.WAITING_APPROVAL


def remove_booking_extra_service(booking, booking_service_id):
    """Drop an extra service while the visit is waiting on the quote. Primary service stays."""
    if not visit_quote_is_open(booking):
        raise ValidationError({"service": "Extras can only be removed while the quote is waiting for approval."})
    row = booking.added_services.filter(pk=booking_service_id).select_related("service").first()
    if row is None:
        raise ValidationError({"service": "That extra service is not on this visit."})
    price = Decimal(row.price or 0)
    name = row.service.name
    row.delete()
    try:
        invoice = booking.repair_job.invoice
    except (RepairJob.DoesNotExist, Invoice.DoesNotExist):
        invoice = None
    if invoice is not None and invoice.status != Invoice.Status.CANCELLED:
        invoice.service_cost = max(Decimal("0"), Decimal(invoice.service_cost or 0) - price)
        invoice.save()
        refresh_invoice_status(invoice)
    from django_app.telegram_bot import booking_detail_fields, format_customer_alert

    plate = booking.vehicle.plate if booking.vehicle_id else "your car"
    notify_customer(
        booking.customer_id,
        kind=Notification.Kind.BOOKING,
        title="Service removed from quote",
        message=f"{name} was removed from the quote for {plate}.",
        telegram_text=format_customer_alert(
            emoji="🔧",
            title="Service removed",
            customer=booking.customer,
            fields=booking_detail_fields(booking) + [f"✏️ Removed: {name}"],
            body="This service was removed from your quote.",
        ),
    )
    return booking


def part_request_can_withdraw(part_request):
    """Customer may drop a part while the visit quote is open, or cancel a parts-only request before issue."""
    if part_request is None:
        return False
    if part_request.parts_usage_id:
        return False
    if part_request.status in (PartRequest.Status.CONFIRMED, PartRequest.Status.CANCELLED):
        return False
    booking = part_request.booking
    if booking is not None:
        return visit_quote_is_open(booking)
    return part_request.fulfillment in (
        PartRequest.Fulfillment.PICKUP,
        PartRequest.Fulfillment.DELIVERY,
    )


def withdraw_part_request(part_request):
    """Customer removes a pending part from the quote or cancels a parts-only request."""
    if not part_request_can_withdraw(part_request):
        raise ValidationError("This part request can no longer be removed.")
    job = part_request.repair_job
    if job is None and part_request.booking_id:
        try:
            job = part_request.booking.repair_job
        except RepairJob.DoesNotExist:
            job = None
    part_request.delete()
    if job is not None:
        sync_invoice_costs(job)
    return None


def confirm_customer_part_purchase(part_request):
    """Customer accepts a pickup/delivery part request. Stock and payment stay with the garage."""
    if part_request is None:
        raise ValidationError("That part request was not found.")
    if part_request.fulfillment not in (PartRequest.Fulfillment.PICKUP, PartRequest.Fulfillment.DELIVERY):
        raise ValidationError("Workshop install parts are approved on the visit quote.")
    if part_request.status == PartRequest.Status.CONFIRMED or part_request.parts_usage_id:
        raise ValidationError("This part request is already confirmed.")
    part_request.status = PartRequest.Status.NOTED
    part_request.save(update_fields=["status"])
    from django_app.telegram_bot import format_customer_alert

    part_name = part_request.spare_part.name if part_request.spare_part_id else "Part"
    notify_customer(
        part_request.customer_id,
        kind=Notification.Kind.INVOICE,
        title=f"{part_request.number} purchase confirmed",
        message=(
            f"{part_name} is confirmed for "
            f"{part_request.get_fulfillment_display().lower()}. "
            "The garage prepares the invoice and handoff."
        ),
        telegram_text=format_customer_alert(
            emoji="⚙️",
            title="Part purchase confirmed",
            customer=part_request.customer,
            fields=[
                f"📦 Part: {part_name}",
                f"🆔 Request: {part_request.number}",
            ],
            body="The garage will prepare the invoice and handoff for you.",
        ),
    )
    return part_request


def sync_booking_from_job(job):
    """The booking stores the same status as its work order."""
    if not job.booking_id:
        sync_vehicle_shop_status(getattr(job, "vehicle", None))
        return
    booking = Booking.objects.select_related("customer", "vehicle", "service").filter(pk=job.booking_id).first()
    if booking is None or booking.status == Booking.Status.CANCELLED:
        sync_vehicle_shop_status(getattr(job, "vehicle", None))
        return
    new_status = job.status
    if booking.status != new_status:
        previous = booking.status
        Booking.objects.filter(pk=booking.pk).update(status=new_status)
        booking.status = new_status
        _notify_booking_stage(booking, job, previous)
    sync_vehicle_shop_status(booking.vehicle)


def _notify_booking_stage(booking, job, previous):
    from django_app.telegram_bot import booking_detail_fields, format_customer_alert

    service_name = booking.service.name if booking.service_id else "your visit"
    plate = booking.vehicle.plate if booking.vehicle_id else "your car"
    if job.status == RepairJob.Status.COMPLETED:
        title = "Visit completed"
        message = f"{service_name} for {plate} is finished. Collect your bill at the garage."
        emoji, tg_title = "🏁", "Visit completed"
        body = [
            "Your service is finished.",
            "🧾 Collect your bill at the garage, or pay from Invoices in your account.",
        ]
        visit_fields = booking_detail_fields(booking)
    elif job.status == RepairJob.Status.DIAGNOSING and previous in (
        Booking.Status.PENDING,
        Booking.Status.CONFIRMED,
        Booking.Status.WAITING,
        Booking.Status.CHECKED_IN,
    ):
        title = "Car checked in"
        message = f"{service_name} for {plate} is checked in. Follow progress in Tracking."
        emoji, tg_title = "🚘", "Car checked in"
        body = [
            "Your car is checked in. The team has started looking after it.",
            "Follow progress anytime in Tracking.",
        ]
        visit_fields = booking_detail_fields(booking)
    elif job.status == RepairJob.Status.WAITING and previous in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
        title = "Booking confirmed"
        message = f"{service_name} for {plate} is confirmed. Please bring your car at the scheduled time."
        emoji, tg_title = "✅", "Booking confirmed"
        body = [
            "Your booking is confirmed.",
            "Please bring your car at the scheduled time.",
        ]
        visit_fields = booking_detail_fields(booking, include_when=True)
    elif job.status == RepairJob.Status.WAITING_APPROVAL:
        title = "Approval needed"
        message = f"{service_name} for {plate} needs your approval. Open Quotes or Tracking to review."
        emoji, tg_title = "📋", "Approval needed"
        body = [
            "We need your OK before continuing.",
            "👉 Open Quotes or Tracking to review and approve or decline.",
        ]
        visit_fields = booking_detail_fields(booking)
    elif job.status == RepairJob.Status.READY_FOR_PICKUP:
        title = "Ready for pickup"
        message = f"{service_name} for {plate} is ready for pickup."
        emoji, tg_title = "🎉", "Ready for pickup"
        body = [
            "Good news — your car is ready!",
            "Please come to the garage when you can.",
        ]
        visit_fields = booking_detail_fields(booking)
    elif job.status == RepairJob.Status.REPAIRING and previous == Booking.Status.WAITING_APPROVAL:
        title = "Repair continuing"
        message = f"{service_name} for {plate} is confirmed. The workshop will continue the repair."
        emoji, tg_title = "✅", "Repair continuing"
        body = "Thanks — you’re all set. The workshop will continue the repair."
        visit_fields = booking_detail_fields(booking)
    elif job.status == RepairJob.Status.CANCELLED:
        title = "Visit cancelled"
        message = f"{service_name} for {plate} was cancelled. Repair will not continue."
        emoji, tg_title = "🚫", "Visit cancelled"
        body = [
            "This visit was cancelled. The repair will not continue.",
            "If you still need help, contact the garage or book again.",
        ]
        visit_fields = booking_detail_fields(booking)
    else:
        title = "Tracking update"
        status_label = job.get_status_display()
        message = f"{service_name} for {plate} is now {status_label}."
        emoji, tg_title = "📍", "Tracking update"
        body = "Your visit status was updated. Open Tracking for details."
        visit_fields = booking_detail_fields(booking, include_status=status_label)
    notify_customer(
        booking.customer_id,
        kind=Notification.Kind.REPAIR if job.status not in (
            RepairJob.Status.WAITING,
            RepairJob.Status.CANCELLED,
        ) else Notification.Kind.BOOKING,
        title=title,
        message=message,
        telegram_text=format_customer_alert(
            emoji=emoji,
            title=tg_title,
            customer=booking.customer,
            fields=visit_fields,
            body=body,
        ),
    )


def linked_job(booking):
    if booking is None or not getattr(booking, "pk", None):
        return None
    try:
        return booking.repair_job
    except RepairJob.DoesNotExist:
        return None


def booking_status_locked(booking):
    """Pending and confirmed visits can still change status. A work order takes over after that."""
    if not getattr(booking, "pk", None):
        return False
    if linked_job(booking) is not None:
        return True
    return booking.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED)


def booking_can_check_in(booking):
    if booking.status in (Booking.Status.CANCELLED, Booking.Status.COMPLETED):
        return False
    job = linked_job(booking)
    if job is None:
        return booking.status in (Booking.Status.PENDING, Booking.Status.CONFIRMED)
    return job.status == RepairJob.Status.WAITING


def booking_can_finish(booking):
    if booking.status in (
        Booking.Status.PENDING,
        Booking.Status.CONFIRMED,
        Booking.Status.WAITING,
        Booking.Status.CANCELLED,
        Booking.Status.COMPLETED,
    ):
        return False
    job = linked_job(booking)
    if job is None:
        return False
    return job.status not in (RepairJob.Status.COMPLETED, RepairJob.Status.WAITING)


def booking_can_cancel(booking):
    if booking.status in (Booking.Status.COMPLETED, Booking.Status.CANCELLED):
        return False
    job = linked_job(booking)
    if job is None:
        return booking.status in (Booking.Status.PENDING, Booking.Status.CONFIRMED)
    return job.status == RepairJob.Status.WAITING and not job.parts_used.exists() and not Invoice.objects.filter(repair_job=job).exists()


def _staff_for(user):
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    return Staff.objects.filter(user=user).first()


def _issue_part_on_job(part_request, job, part, user=None):
    staff = _staff_for(user)
    usage = PartsUsage(
        repair_job=job,
        spare_part=part,
        quantity=1,
        unit_price=part.unit_price,
        recorded_by=staff,
    )
    usage._skip_invoice_sync = True
    usage.save()
    part_request.booking_id = part_request.booking_id or job.booking_id
    part_request.repair_job = job
    part_request.parts_usage = usage
    part_request.status = PartRequest.Status.CONFIRMED
    part_request.save(update_fields=["booking", "repair_job", "parts_usage", "status"])
    invoice = sync_invoice_costs(job)
    if invoice is None:
        number = f"INV-{part_request.number}"
        if Invoice.objects.filter(number=number).exists():
            number = f"INV-{part_request.number}-{part_request.pk}"
        holder = job.booking if job.booking_id else None
        service_cost = Decimal("0")
        if holder is not None and not (holder.note or "").startswith("Opened from"):
            service_cost = visit_service_total(holder)
        if not Invoice.objects.filter(repair_job_id=job.pk).exists():
            Invoice.objects.create(
                number=number,
                customer_id=part_request.customer_id,
                vehicle_id=part_request.vehicle_id,
                repair_job=job,
                labor_cost=Decimal("0"),
                service_cost=service_cost,
                parts_cost=Decimal("0"),
                status=Invoice.Status.UNPAID,
            )
        invoice = sync_invoice_costs(job)
    from django_app.telegram_bot import format_customer_alert

    notify_customer(
        part_request.customer_id,
        kind=Notification.Kind.INVOICE,
        title=f"{part_request.number} confirmed",
        message=(
            f"{part.name} is confirmed on your visit and billed on {invoice.number}. "
            "Any remaining balance is due at the garage."
        ),
        telegram_text=format_customer_alert(
            emoji="⚙️",
            title="Part confirmed",
            customer=part_request.customer,
            fields=[
                f"📦 Part: {part.name}",
                f"🧾 Invoice: {invoice.number}",
            ],
            body=[
                "This part is confirmed on your visit.",
                "💰 Any remaining balance is due at the garage.",
            ],
        ),
    )
    return part_request


def ensure_visit_invoice(job):
    invoice = Invoice.objects.filter(repair_job_id=job.pk).first()
    if invoice is not None:
        return sync_invoice_costs(job)
    if not job.booking_id:
        return None
    number = f"INV-BK-{job.booking_id:04d}"
    if Invoice.objects.filter(number=number).exists():
        number = f"INV-BK-{job.booking_id:04d}-{job.id}"
    invoice = Invoice.objects.create(
        number=number,
        customer_id=job.customer_id,
        vehicle_id=job.vehicle_id,
        repair_job=job,
        labor_cost=Decimal("0"),
        service_cost=visit_service_total(job.booking),
        parts_cost=Decimal("0"),
        status=Invoice.Status.UNPAID,
    )
    from django_app.telegram_bot import format_customer_alert

    plate = job.vehicle.plate if job.vehicle_id else "your car"
    notify_customer(
        job.customer_id,
        kind=Notification.Kind.INVOICE,
        title=f"Invoice {invoice.number}",
        message=(
            f"Your invoice is ready for {plate}. "
            "Pay at the garage or from Invoices in your account."
        ),
        telegram_text=format_customer_alert(
            emoji="🧾",
            title="Invoice ready",
            customer=job.customer,
            fields=[
                f"🚗 Car: {plate}",
                f"🧾 Invoice: {invoice.number}",
            ],
            body=[
                "Your bill is ready.",
                "👉 Pay at the garage, or from Invoices in your account.",
            ],
        ),
    )
    return sync_invoice_costs(job)


def ensure_confirmed_job(booking):
    """A confirmed visit opens one waiting work order. The booking then uses that job's status."""
    if booking is None or booking.status != Booking.Status.CONFIRMED:
        return linked_job(booking)
    job = linked_job(booking)
    if job is not None:
        return job
    return RepairJob.objects.create(
        booking=booking,
        customer_id=booking.customer_id,
        vehicle_id=booking.vehicle_id,
        problem=booking.problem or (booking.service.name if booking.service_id else ""),
        start_date=booking.booking_date or timezone.localdate(),
        status=RepairJob.Status.WAITING,
        progress=0,
    )


def check_in_booking(booking, user=None):
    """Receive the car. Open the inspection, the work order, and the invoice for this visit."""
    with transaction.atomic():
        booking = Booking.objects.select_for_update().select_related("service", "vehicle", "customer").get(pk=booking.pk)
        if booking.status in (Booking.Status.CANCELLED, Booking.Status.COMPLETED):
            raise ValidationError("This visit is already closed.")
        try:
            job = booking.repair_job
        except RepairJob.DoesNotExist:
            job = RepairJob.objects.create(
                booking=booking,
                customer_id=booking.customer_id,
                vehicle_id=booking.vehicle_id,
                problem=booking.problem or (booking.service.name if booking.service_id else ""),
                start_date=timezone.localdate(),
                status=RepairJob.Status.DIAGNOSING,
                progress=10,
            )
        else:
            if job.status == RepairJob.Status.COMPLETED:
                raise ValidationError("This visit is already finished.")
            if job.status == RepairJob.Status.WAITING:
                job.status = RepairJob.Status.DIAGNOSING
                job.progress = max(job.progress or 0, 10)
                job.save(update_fields=["status", "progress"])
            else:
                sync_booking_from_job(job)
        ensure_job_inspection(job, user)
        ensure_visit_invoice(job)
        sync_vehicle_shop_status(booking.vehicle)
        booking.refresh_from_db()
        waiting = list(
            PartRequest.objects.select_for_update()
            .filter(booking=booking, status=PartRequest.Status.CONFIRMED, parts_usage__isnull=True)
            .select_related("spare_part")
        )
        for request_row in waiting:
            part = SparePart.objects.select_for_update().get(pk=request_row.spare_part_id)
            if part.quantity < 1:
                continue
            _issue_part_on_job(request_row, job, part, user)
        return booking


def confirm_part_request(part_request, user=None):
    """Accept a part onto the customer's open visit. Stock drops when the work order can take it.

    Payment is not created here. The cashier records it against the invoice.
    """
    with transaction.atomic():
        part_request = PartRequest.objects.select_for_update().get(pk=part_request.pk)
        if part_request.parts_usage_id:
            return part_request
        if part_request.status == PartRequest.Status.CANCELLED:
            raise ValidationError("This part request was cancelled.")
        if not part_request.vehicle_id:
            raise ValidationError({"vehicle": "Choose the vehicle. The work order and the invoice both need a car."})

        part = SparePart.objects.select_for_update().get(pk=part_request.spare_part_id)
        if part.status != SparePart.Status.ACTIVE:
            raise ValidationError({"spare_part": "That part is not available."})
        if part.quantity < 1:
            raise ValidationError({"spare_part": "That part is out of stock, so it cannot be issued. Cancel the request and say why."})

        visit = part_request.booking
        if visit is not None and visit.status == Booking.Status.CANCELLED:
            raise ValidationError("This visit was cancelled, so this part stays off the job.")
        if visit is None or visit.status not in OPEN_VISIT:
            visit = open_visit_for(part_request.customer, part_request.vehicle)
        job = None
        if visit is not None:
            try:
                job = visit.repair_job
            except RepairJob.DoesNotExist:
                job = None
            if job is None:
                if part_request.status == PartRequest.Status.CONFIRMED and part_request.booking_id == visit.id:
                    return part_request
                part_request.booking = visit
                part_request.status = PartRequest.Status.CONFIRMED
                part_request.save(update_fields=["booking", "status"])
                from django_app.telegram_bot import booking_detail_fields, format_customer_alert

                plate = visit.vehicle.plate if visit.vehicle_id else "your car"
                # Refresh visit so part_requests includes this row after save.
                visit.refresh_from_db()
                notify_customer(
                    part_request.customer_id,
                    kind=Notification.Kind.BOOKING,
                    title=f"{part_request.number} added to your visit",
                    message=(
                        f"{part.name} was added to your visit for {plate}. "
                        "The garage prepares it when the car is checked in."
                    ),
                    telegram_text=format_customer_alert(
                        emoji="📦",
                        title="Part added",
                        customer=part_request.customer,
                        fields=booking_detail_fields(visit)
                        + [
                            f"🆔 Request: {part_request.number}",
                            f"✏️ Added part: {part.name}",
                        ],
                        body=[
                            "This part was added to your visit.",
                            "The garage will prepare it when your car is in.",
                        ],
                    ),
                )
                return part_request

        open_statuses = (
            RepairJob.Status.WAITING,
            RepairJob.Status.DIAGNOSING,
            RepairJob.Status.WAITING_APPROVAL,
            RepairJob.Status.REPAIRING,
            RepairJob.Status.QUALITY_CHECK,
            RepairJob.Status.READY_FOR_PICKUP,
        )
        billable = (Invoice.Status.DRAFT, Invoice.Status.UNPAID, Invoice.Status.PARTIAL)
        job = (
            RepairJob.objects.select_for_update()
            .filter(
                customer_id=part_request.customer_id,
                vehicle_id=part_request.vehicle_id,
                status__in=open_statuses,
            )
            .filter(models.Q(invoice__isnull=True) | models.Q(invoice__status__in=billable))
            .order_by("-id")
            .first()
        )
        if job is None:
            service = Service.objects.filter(status="ACTIVE").order_by("id").first()
            if service is None:
                raise ValidationError("Add an active service in the catalog before confirming a part onto a new work order.")
            install = part_request.fulfillment == PartRequest.Fulfillment.INSTALL
            problem = f"{part_request.number}: {part.name} ({part_request.get_fulfillment_display()})"
            if part_request.notes:
                problem = f"{problem}. {part_request.notes}"
            booking = Booking.objects.create(
                customer_id=part_request.customer_id,
                vehicle_id=part_request.vehicle_id,
                service=service,
                booking_date=timezone.localdate(),
                problem=problem,
                note=f"Opened from {part_request.number}",
                status=Booking.Status.IN_SERVICE if install else Booking.Status.CONFIRMED,
            )
            job = RepairJob.objects.create(
                booking=booking,
                customer_id=part_request.customer_id,
                vehicle_id=part_request.vehicle_id,
                problem=problem,
                start_date=timezone.localdate(),
                status=RepairJob.Status.REPAIRING if install else RepairJob.Status.READY_FOR_PICKUP,
                progress=30 if install else 80,
            )

        return _issue_part_on_job(part_request, job, part, user)


def confirm_customer_repair(job):
    """The customer quote is the only way out of waiting for approval."""
    if job is None or job.status != RepairJob.Status.WAITING_APPROVAL:
        raise ValidationError("This visit is not waiting for approval.")
    if not inspection_is_complete(job):
        raise ValidationError("The inspection is not finished.")
    job.status = RepairJob.Status.REPAIRING
    job.save(update_fields=["status"])
    sync_invoice_costs(job)
    return job


def decline_repair(job, user=None, reason=""):
    """Cancel the visit from the quote. Keep the inspection. Do not touch stock or payments."""
    if job is None or job.status != RepairJob.Status.WAITING_APPROVAL:
        raise ValidationError("This visit is not waiting for approval.")
    if job.parts_used.exists():
        raise ValidationError("Parts are already on this work order. Ask the garage to close the visit.")
    try:
        invoice = job.invoice
    except Invoice.DoesNotExist:
        invoice = None
    if invoice is not None and invoice.payments.filter(
        status__in=(Payment.Status.PENDING, Payment.Status.PAID)
    ).exists():
        raise ValidationError("A payment is already recorded. Ask the garage to close the visit.")
    booking = job.booking
    booking.cancel_reason = (reason or "")[:2000]
    booking.cancelled_at = timezone.now()
    if user is not None and getattr(user, "is_authenticated", False):
        booking.cancelled_by = user
    booking.save(update_fields=["cancel_reason", "cancelled_at", "cancelled_by"])
    job.status = RepairJob.Status.CANCELLED
    job.save(update_fields=["status"])
    if invoice is not None and invoice.status != Invoice.Status.CANCELLED:
        Invoice.objects.filter(pk=invoice.pk).update(status=Invoice.Status.CANCELLED)
        invoice.status = Invoice.Status.CANCELLED
    return job


def cancel_booking(booking, user=None, reason=""):
    """Cancel a visit that has not entered the workshop. A waiting work order is removed with it."""
    if not booking_can_cancel(booking):
        raise ValidationError("This visit is already in the workshop. Finish the work order instead of cancelling the booking.")
    job = linked_job(booking)
    if job is not None:
        job.delete()
    booking.status = Booking.Status.CANCELLED
    booking.cancel_reason = (reason or "")[:2000]
    booking.cancelled_at = timezone.now()
    if user is not None and getattr(user, "is_authenticated", False):
        booking.cancelled_by = user
    booking.save()
    sync_vehicle_shop_status(booking.vehicle)
    return booking


def complete_booking(booking):
    """Finish the visit by finishing its work order. The booking status follows that job."""
    if not booking_can_finish(booking):
        raise ValidationError("This visit is not in the workshop.")
    job = linked_job(booking)
    if job is None:
        raise ValidationError("This visit has no work order yet.")
    if job.status != RepairJob.Status.COMPLETED:
        job.status = RepairJob.Status.COMPLETED
        job.progress = 100
        job.save(update_fields=["status", "progress"])
    else:
        sync_booking_from_job(job)
    booking.refresh_from_db()
    return booking

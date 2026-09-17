from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.deletion import ProtectedError
from django.db.utils import OperationalError, ProgrammingError


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

    phone = models.CharField(max_length=40, blank=True)
    photo = models.URLField(blank=True)
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
        super().save(*args, **kwargs)
        apply_role_assignment(self, previous_role=previous_role)
        self._sync_profile_identity()

    def _sync_profile_identity(self):
        full_name = self.get_full_name() or self.username
        Customer.objects.filter(user=self).update(
            name=full_name,
            email=self.email or "",
            phone=self.phone,
            photo=self.photo,
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
    record.photo = user.photo or record.photo
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
    photo = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)

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

    def __str__(self):
        return self.name


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
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
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="inspection")
    mileage = models.PositiveIntegerField(default=0)
    fuel_level = models.CharField(max_length=40, blank=True)
    front_brake_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    rear_brake_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    tire_tread_mm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    condition = models.TextField(blank=True)
    damage = models.TextField(blank=True)
    complaint = models.TextField(blank=True)
    note = models.TextField(blank=True)
    photos = models.TextField(blank=True)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    staff = models.ForeignKey(
        Staff,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inspections",
    )

    def __str__(self):
        return f"Inspection {self.booking_id}"


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
                "photo": user.photo or "",
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


def ensure_default_roles():
    for item in DEFAULT_ROLES:
        if not Role.objects.filter(code=item["code"]).exists():
            Role(**item).save(sync_users=False)


class RepairJob(models.Model):
    class Status(models.TextChoices):
        WAITING = "WAITING", "Waiting"
        DIAGNOSING = "DIAGNOSING", "Diagnosing"
        WAITING_APPROVAL = "WAITING_APPROVAL", "Waiting for approval"
        REPAIRING = "REPAIRING", "Repairing"
        WAITING_PARTS = "WAITING_PARTS", "Waiting for parts"
        QUALITY_CHECK = "QUALITY_CHECK", "Quality check"
        READY_FOR_PICKUP = "READY_FOR_PICKUP", "Ready for pickup"
        COMPLETED = "COMPLETED", "Completed"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="repair_job")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="repair_jobs")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="repair_jobs")
    mechanic = models.ForeignKey(
        Mechanic, null=True, blank=True, on_delete=models.SET_NULL, related_name="repair_jobs"
    )
    problem = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    estimated_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.WAITING)
    progress = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "work order"
        verbose_name_plural = "work orders"

    def __str__(self):
        return f"Job {self.id} — {self.vehicle}"


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

    def save(self, *args, **kwargs):
        self.total = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.spare_part} x{self.quantity}"


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

    def save(self, *args, **kwargs):
        self.subtotal = self.labor_cost + self.service_cost + self.parts_cost
        self.grand_total = self.subtotal - self.discount + self.tax
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
        UNPAID = "UNPAID", "Unpaid"
        PARTIAL = "PARTIAL", "Partially paid"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    number = models.CharField(max_length=40, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    paid_at = models.DateField()
    reference = models.CharField(max_length=80, blank=True)
    received_by = models.ForeignKey(
        Staff,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payments_taken",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)
    receipt_number = models.CharField(max_length=40, blank=True)

    def __str__(self):
        return self.number

from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from django_app.models import (
    BlogPost,
    Booking,
    BookingService,
    add_booking_service,
    attach_booking_catalog_items,
    booking_slot_taken,
    cancel_booking,
    claimed_payment_total,
    confirm_customer_repair,
    decline_repair,
    open_visit_for,
    OPEN_VISIT,
    confirm_customer_part_purchase,
    invoice_payment_state,
    next_payment_number,
    part_request_can_withdraw,
    remove_booking_extra_service,
    sync_invoice_costs,
    sync_vehicle_shop_status,
    verified_payment_total,
    visit_open_part_requests,
    withdraw_part_request,
    withdraw_pending_payment,
    Estimate,
    Inspection,
    Invoice,
    Notification,
    PartsUsage,
    PartRequest,
    Payment,
    RepairJob,
    Service,
    SparePart,
    Vehicle,
    notify_customer,
)
from django_app.permissions import IsCustomer
from django_app.plates import normalize_vehicle_plate, require_vehicle_plate
from django_app.uploads import looks_like_image_filename, validate_uploaded_image


def _conflict(vehicle, booking_date, booking_time, ignore_pk=None):
    return booking_slot_taken(vehicle, booking_date, booking_time, ignore_pk=ignore_pk)


class CustomerApiMixin:
    permission_classes = [IsCustomer]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        try:
            self.customer = request.user.customer
        except ObjectDoesNotExist as exc:
            raise PermissionDenied("No customer profile for this account.") from exc


class CustomerVehicleSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "plate",
            "brand",
            "model",
            "year",
            "color",
            "vehicle_type",
            "vin",
            "engine_number",
            "mileage",
            "status",
            "next_service_date",
            "next_service_mileage",
            "notes",
            "image",
            "image_url",
        ]
        read_only_fields = ["status", "image_url", "next_service_date", "next_service_mileage"]
        extra_kwargs = {
            "image": {"required": False, "allow_null": True, "validators": [validate_uploaded_image]},
        }

    def get_image_url(self, vehicle):
        return absolute_media_url(self, vehicle.image)

    def validate_plate(self, value):
        plate = normalize_vehicle_plate(value)
        current = normalize_vehicle_plate(getattr(self.instance, "plate", "")) if getattr(self.instance, "pk", None) else ""
        if current and plate == current:
            return self.instance.plate
        try:
            return require_vehicle_plate(plate)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc

    def validate_brand(self, value):
        brand = (value or "").strip()
        if looks_like_image_filename(brand):
            previous = (getattr(self.instance, "brand", "") or "").strip()
            if previous and not looks_like_image_filename(previous):
                return previous
            raise serializers.ValidationError("Enter the vehicle make, for example Toyota or Honda.")
        return brand

    def validate_year(self, value):
        if value < 1950 or value > 2100:
            raise serializers.ValidationError("Enter a vehicle year between 1950 and 2100.")
        return value

    def validate_vin(self, value):
        return (value or "").strip() or None


class CustomerVehicleViewSet(CustomerApiMixin, viewsets.ModelViewSet):
    serializer_class = CustomerVehicleSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    queryset = Vehicle.objects.none()

    def get_queryset(self):
        return Vehicle.objects.filter(customer=self.customer).order_by("plate")

    def perform_create(self, serializer):
        vehicle = serializer.save(customer=self.customer, status=Vehicle.Status.ACTIVE)
        from django_app.models import Notification, notify_customer
        from django_app.telegram_bot import format_customer_alert

        car_line = f"{vehicle.plate} — {vehicle.brand} {vehicle.model} ({vehicle.year})"
        notify_customer(
            self.customer,
            kind=Notification.Kind.VEHICLE,
            title="Vehicle added",
            message=f"{car_line} is on your account.",
            telegram_text=format_customer_alert(
                emoji="🚗",
                title="Vehicle added",
                customer=self.customer,
                fields=[f"🚗 {car_line}"],
                body="Your car is now on your account. You can book a visit anytime.",
            ),
        )

    def perform_update(self, serializer):
        vehicle = self.get_object()
        tracked = (
            ("plate", "Plate"),
            ("brand", "Brand"),
            ("model", "Model"),
            ("year", "Year"),
            ("color", "Color"),
            ("vehicle_type", "Vehicle type"),
            ("vin", "VIN"),
            ("engine_number", "Engine number"),
            ("mileage", "Mileage"),
            ("notes", "Notes"),
        )
        before = {key: getattr(vehicle, key) for key, _ in tracked}
        vehicle = serializer.save()
        changes = []
        for key, label in tracked:
            old, new = before[key], getattr(vehicle, key)
            if old != new:
                changes.append((label, old, new))
        if "image" in getattr(serializer, "validated_data", {}):
            changes.append(("Photo", None, "updated"))
        if not changes:
            return
        from django_app.models import Notification, notify_customer
        from django_app.telegram_bot import format_change_lines, format_customer_alert

        car_line = f"{vehicle.plate} — {vehicle.brand} {vehicle.model} ({vehicle.year})"
        change_lines = format_change_lines(changes)
        notify_customer(
            self.customer,
            kind=Notification.Kind.VEHICLE,
            title="Vehicle updated",
            message=f"Updated on {car_line}: " + "; ".join(f"{c[0]}" for c in changes),
            telegram_text=format_customer_alert(
                emoji="🚗",
                title="Vehicle updated",
                customer=self.customer,
                fields=[f"🚗 {car_line}"] + change_lines,
                body="Your vehicle details were updated.",
            ),
        )

    def destroy(self, request, *args, **kwargs):
        vehicle = self.get_object()
        if (
            vehicle.bookings.exists()
            or vehicle.repair_jobs.exists()
            or vehicle.invoices.exists()
            or vehicle.estimates.exists()
        ):
            return Response(
                {"detail": "This vehicle has service records, so it stays on your account. You can still edit its details."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(vehicle)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerBookingSerializer(serializers.ModelSerializer):
    services = serializers.SerializerMethodField()
    work_order_number = serializers.SerializerMethodField()
    work_order_status = serializers.SerializerMethodField()
    mechanic_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    extra_services = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Service.objects.filter(status="ACTIVE"),
        required=False,
        write_only=True,
    )
    parts = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=SparePart.objects.filter(status=SparePart.Status.ACTIVE),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "vehicle",
            "service",
            "booking_date",
            "booking_time",
            "problem",
            "note",
            "status",
            "cancel_reason",
            "created_at",
            "services",
            "work_order_number",
            "work_order_status",
            "mechanic_name",
            "status_label",
            "extra_services",
            "parts",
        ]
        read_only_fields = [
            "status",
            "cancel_reason",
            "created_at",
            "services",
            "work_order_number",
            "work_order_status",
            "mechanic_name",
            "status_label",
        ]

    def validate(self, attrs):
        customer = self.context["request"].user.customer
        vehicle = attrs.get("vehicle") or getattr(self.instance, "vehicle", None)
        service = attrs.get("service") or getattr(self.instance, "service", None)
        booking_date = attrs.get("booking_date") or getattr(self.instance, "booking_date", None)
        if "booking_time" in attrs:
            booking_time = attrs.get("booking_time")
        else:
            booking_time = getattr(self.instance, "booking_time", None)
        if vehicle and vehicle.customer_id != customer.id:
            raise serializers.ValidationError({"vehicle": "This vehicle is not on your account."})
        if service and service.status != "ACTIVE":
            raise serializers.ValidationError({"service": "This service is not available."})
        if service:
            from django_app.models import service_is_bookable

            if not service_is_bookable(service):
                raise serializers.ValidationError(
                    {"service": f"{service.name} is out of stock (package parts unavailable)."}
                )
        if vehicle and booking_date and _conflict(vehicle, booking_date, booking_time, ignore_pk=getattr(self.instance, "pk", None)):
            raise serializers.ValidationError({"booking_time": "That vehicle already has a booking at this time."})

        extras = attrs.get("extra_services") or []
        if extras:
            seen = set()
            cleaned = []
            from django_app.models import service_is_bookable

            for item in extras:
                if service and item.id == service.id:
                    continue
                if item.id in seen:
                    continue
                if item.status != "ACTIVE":
                    raise serializers.ValidationError({"extra_services": f"{item.name} is not available."})
                if not service_is_bookable(item):
                    raise serializers.ValidationError(
                        {"extra_services": f"{item.name} is out of stock (package parts unavailable)."}
                    )
                seen.add(item.id)
                cleaned.append(item)
            attrs["extra_services"] = cleaned

        parts = attrs.get("parts") or []
        if parts:
            seen_parts = set()
            cleaned_parts = []
            for part in parts:
                if part.id in seen_parts:
                    continue
                if part.status != SparePart.Status.ACTIVE:
                    raise serializers.ValidationError({"parts": f"{part.name} is not available."})
                if (part.quantity or 0) < 1:
                    raise serializers.ValidationError({"parts": f"{part.name} is out of stock."})
                seen_parts.add(part.id)
                cleaned_parts.append(part)
            attrs["parts"] = cleaned_parts
        return attrs

    def create(self, validated_data):
        extras = validated_data.pop("extra_services", [])
        parts = validated_data.pop("parts", [])
        with transaction.atomic():
            booking = super().create(validated_data)
            attach_booking_catalog_items(booking, extra_services=extras, spare_parts=parts)
        return booking

    def get_services(self, booking):
        rows = []
        if booking.service_id:
            rows.append(
                {
                    "id": None,
                    "name": booking.service.name,
                    "price": booking.service.price,
                    "primary": True,
                    "source": "BOOKING",
                    "note": "",
                }
            )
        for extra in booking.added_services.all():
            rows.append(
                {
                    "id": extra.id,
                    "name": extra.service.name,
                    "price": extra.price,
                    "primary": False,
                    "source": extra.source or BookingService.Source.CUSTOMER,
                    "note": extra.note or "",
                }
            )
        return rows

    def get_work_order_number(self, booking):
        try:
            job = booking.repair_job
        except RepairJob.DoesNotExist:
            return ""
        return f"WO-{job.id:04d}"

    def get_work_order_status(self, booking):
        try:
            job = booking.repair_job
        except RepairJob.DoesNotExist:
            return ""
        return job.status

    def get_mechanic_name(self, booking):
        try:
            job = booking.repair_job
        except RepairJob.DoesNotExist:
            return ""
        if not job.mechanic_id or not job.mechanic.user_id:
            return ""
        return account_name(job.mechanic.user)


class RescheduleSerializer(serializers.Serializer):
    booking_date = serializers.DateField()
    booking_time = serializers.TimeField(required=False, allow_null=True)


class CustomerBookingViewSet(CustomerApiMixin, viewsets.ModelViewSet):
    serializer_class = CustomerBookingSerializer
    http_method_names = ["get", "post", "head", "options"]
    queryset = Booking.objects.none()

    def get_queryset(self):
        return (
            Booking.objects.filter(customer=self.customer)
            .select_related("vehicle", "service", "repair_job__mechanic__user")
            .prefetch_related("added_services__service")
            .order_by("-booking_date", "-id")
        )

    def perform_create(self, serializer):
        booking = serializer.save(customer=self.customer, status=Booking.Status.PENDING)
        from django_app.models import notify_customer
        from django_app.telegram_bot import booking_detail_fields, format_booking_when, format_customer_alert

        when = format_booking_when(booking) or (
            booking.booking_date.isoformat() if booking.booking_date else ""
        )
        plate = booking.vehicle.plate if booking.vehicle_id else "your car"
        service_name = booking.service.name if booking.service_id else "Service"
        notify_customer(
            self.customer,
            kind=Notification.Kind.BOOKING,
            title="Booking received",
            message=f"{service_name} for {plate} on {when} is pending confirmation.",
            telegram_text=format_customer_alert(
                emoji="📅",
                title="Booking received",
                customer=self.customer,
                fields=booking_detail_fields(booking, include_when=True),
                body=[
                    "We got your booking. It’s waiting for the garage to confirm.",
                    "We’ll message you when it’s set.",
                ],
            ),
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        try:
            cancel_booking(booking, request.user, str(request.data.get("cancel_reason") or ""))
        except ValidationError as exc:
            message = exc.messages[0] if getattr(exc, "messages", None) else "This booking can no longer be cancelled."
            return Response({"ok": False, "error": message}, status=status.HTTP_400_BAD_REQUEST)
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"])
    def reschedule(self, request, pk=None):
        booking = self.get_object()
        if booking.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED, Booking.Status.WAITING):
            return Response(
                {"ok": False, "error": "This booking can no longer be rescheduled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = RescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking_date = serializer.validated_data["booking_date"]
        booking_time = serializer.validated_data.get("booking_time")
        if _conflict(booking.vehicle, booking_date, booking_time, ignore_pk=booking.pk):
            return Response(
                {"ok": False, "error": "That vehicle already has a booking at this time."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django_app.telegram_bot import format_booking_when

        old_when = format_booking_when(booking)
        booking.booking_date = booking_date
        booking.booking_time = booking_time
        booking.save()
        try:
            job = booking.repair_job
        except RepairJob.DoesNotExist:
            job = None
        if job is not None and job.status != RepairJob.Status.COMPLETED and job.start_date != booking.booking_date:
            job.start_date = booking.booking_date
            job.save(update_fields=["start_date"])
        new_when = format_booking_when(booking)
        if old_when != new_when:
            from django_app.models import Notification, notify_customer
            from django_app.telegram_bot import booking_detail_fields, format_customer_alert

            notify_customer(
                self.customer,
                kind=Notification.Kind.BOOKING,
                title="Booking rescheduled",
                message=f"Your booking was moved to {new_when}.",
                telegram_text=format_customer_alert(
                    emoji="📅",
                    title="Booking rescheduled",
                    customer=self.customer,
                    fields=booking_detail_fields(booking, include_when=True)
                    + [f"✏️ When: {old_when or '(empty)'} → {new_when or '(empty)'}"],
                    body="Your booking time was updated.",
                ),
            )
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"], url_path="add-service")
    def add_service(self, request, pk=None):
        booking = self.get_object()
        service = Service.objects.filter(pk=request.data.get("service")).first()
        if service is None:
            return Response({"service": "Choose a service."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            add_booking_service(booking, service)
        except ValidationError as exc:
            message = exc.messages[0] if getattr(exc, "messages", None) else "That service could not be added."
            return Response({"service": message}, status=status.HTTP_400_BAD_REQUEST)
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"], url_path="remove-service")
    def remove_service(self, request, pk=None):
        booking = self.get_object()
        try:
            remove_booking_extra_service(booking, request.data.get("booking_service"))
        except ValidationError as exc:
            message = exc.messages[0] if getattr(exc, "messages", None) else "That service could not be removed."
            return Response({"service": message}, status=status.HTTP_400_BAD_REQUEST)
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(self.get_serializer(booking).data)


def account_name(user):
    if user is None:
        return ""
    return user.get_full_name() or user.username


def account_photo(serializer, user):
    if user is None or not getattr(user, "photo", None):
        return ""
    return absolute_media_url(serializer, user.photo)


def inspection_staff_user(record):
    inspection = record if isinstance(record, Inspection) else None
    if inspection is None:
        try:
            inspection = record.inspection
        except (AttributeError, ObjectDoesNotExist):
            return None
    staff = inspection.staff
    if staff is None or not staff.user_id:
        return None
    return staff.user


class CustomerInspectionSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    staff_photo = serializers.SerializerMethodField()
    complaint = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    fuel_level = serializers.CharField(source="get_fuel_level_display", read_only=True)

    class Meta:
        model = Inspection
        fields = [
            "id",
            "repair_job",
            "status",
            "status_label",
            "mileage",
            "fuel_level",
            "front_brake_mm",
            "rear_brake_mm",
            "tire_tread_mm",
            "condition",
            "damage",
            "note",
            "complaint",
            "photos",
            "checked_in_at",
            "staff_name",
            "staff_photo",
        ]
        read_only_fields = fields

    def get_staff_name(self, inspection):
        return account_name(inspection_staff_user(inspection))

    def get_staff_photo(self, inspection):
        return account_photo(self, inspection_staff_user(inspection))

    def get_complaint(self, inspection):
        job = inspection.repair_job
        return job.problem if job is not None else ""

    def get_photos(self, inspection):
        from django_app.media_serving import media_url_path

        urls = []
        for shot in inspection.images.all():
            if not shot.image:
                continue
            urls.append(media_url_path(shot.image.name or shot.image.url or ""))
        return urls


class CustomerInspectionViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerInspectionSerializer
    queryset = Inspection.objects.none()

    def get_queryset(self):
        return (
            Inspection.objects.filter(repair_job__customer=self.customer)
            .select_related("repair_job", "staff__user")
            .prefetch_related("images")
        )


class CustomerPartUsageSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="spare_part.name", read_only=True)
    part_number = serializers.CharField(source="spare_part.part_number", read_only=True)

    class Meta:
        model = PartsUsage
        fields = ["id", "part_name", "part_number", "quantity", "unit_price", "total"]


class CustomerRepairSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    mechanic_name = serializers.SerializerMethodField()
    mechanic_photo = serializers.SerializerMethodField()
    parts_used = CustomerPartUsageSerializer(many=True, read_only=True)
    services = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    labor_cost = serializers.SerializerMethodField()
    service_cost = serializers.SerializerMethodField()
    parts_cost = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    invoice_total = serializers.SerializerMethodField()

    class Meta:
        model = RepairJob
        fields = [
            "id",
            "booking",
            "vehicle",
            "vehicle_plate",
            "status",
            "status_label",
            "progress",
            "problem",
            "start_date",
            "estimated_end",
            "mechanic_name",
            "mechanic_photo",
            "parts_used",
            "services",
            "invoice_number",
            "labor_cost",
            "service_cost",
            "parts_cost",
            "discount",
            "tax",
            "invoice_total",
        ]
        read_only_fields = fields

    def get_mechanic_name(self, job):
        if not job.mechanic_id or not job.mechanic.user_id:
            return ""
        return account_name(job.mechanic.user)

    def get_mechanic_photo(self, job):
        if not job.mechanic_id or not job.mechanic.user_id:
            return ""
        return account_photo(self, job.mechanic.user)

    def get_services(self, job):
        booking = job.booking if job.booking_id else None
        if booking is None:
            return []
        rows = []
        if booking.service_id:
            rows.append(
                {
                    "id": None,
                    "name": booking.service.name,
                    "price": booking.service.price,
                    "primary": True,
                    "source": "BOOKING",
                    "note": "",
                }
            )
        for extra in booking.added_services.all():
            rows.append(
                {
                    "id": extra.id,
                    "name": extra.service.name,
                    "price": extra.price,
                    "primary": False,
                    "source": extra.source or BookingService.Source.CUSTOMER,
                    "note": extra.note or "",
                }
            )
        return rows

    def _invoice(self, job):
        try:
            return job.invoice
        except Invoice.DoesNotExist:
            return None

    def get_invoice_number(self, job):
        invoice = self._invoice(job)
        return invoice.number if invoice else ""

    def get_labor_cost(self, job):
        invoice = self._invoice(job)
        return invoice.labor_cost if invoice else Decimal("0")

    def get_service_cost(self, job):
        invoice = self._invoice(job)
        return invoice.service_cost if invoice else Decimal("0")

    def get_parts_cost(self, job):
        invoice = self._invoice(job)
        return invoice.parts_cost if invoice else Decimal("0")

    def get_discount(self, job):
        invoice = self._invoice(job)
        return invoice.discount if invoice else Decimal("0")

    def get_tax(self, job):
        invoice = self._invoice(job)
        return invoice.tax if invoice else Decimal("0")

    def get_invoice_total(self, job):
        invoice = self._invoice(job)
        return invoice.grand_total if invoice else Decimal("0")


class CustomerRepairViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerRepairSerializer
    queryset = RepairJob.objects.none()

    def get_queryset(self):
        return (
            RepairJob.objects.filter(customer=self.customer)
            .select_related("vehicle", "mechanic__user", "booking__service", "inspection", "invoice")
            .prefetch_related("parts_used__spare_part", "booking__added_services__service")
        )

    def _decision_error(self, exc):
        message = exc.messages[0] if getattr(exc, "messages", None) else "This visit could not be updated."
        return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        job = self.get_object()
        try:
            confirm_customer_repair(job)
        except ValidationError as exc:
            return self._decision_error(exc)
        job = self.get_queryset().get(pk=job.pk)
        return Response(self.get_serializer(job).data)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        job = self.get_object()
        try:
            decline_repair(job, request.user, str(request.data.get("reason") or ""))
        except ValidationError as exc:
            return self._decision_error(exc)
        job = self.get_queryset().get(pk=job.pk)
        return Response(self.get_serializer(job).data)


def absolute_media_url(serializer, field):
    """Return a site-relative media URL (/media/...).

    Absolute URLs from request.build_absolute_uri() break when the API is
    reached via Docker service DNS (Host: api:8000) through the Vite proxy —
    browsers cannot resolve `http://api:8000/...`. Relative paths load from
    the frontend origin and are proxied correctly.

    Private uploads (payments, vehicles, etc.) get a signed `?m=` query in
    production so they are not world-readable directory listings.
    """
    if not field:
        return ""
    from django_app.media_serving import media_url_path

    url = field.url or ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    name = getattr(field, "name", None) or url
    return media_url_path(name)


class CustomerServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_url = serializers.SerializerMethodField()
    available_packages = serializers.SerializerMethodField()
    bookable = serializers.SerializerMethodField()
    labor_price = serializers.SerializerMethodField()
    parts_total = serializers.SerializerMethodField()
    estimated_total = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    package_parts = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "price",
            "labor_price",
            "duration_minutes",
            "category",
            "category_name",
            "image_url",
            "available_packages",
            "bookable",
            "parts_total",
            "estimated_total",
            "package_parts",
        ]

    def get_image_url(self, service):
        return absolute_media_url(self, service.image)

    def get_available_packages(self, service):
        from django_app.models import service_package_capacity

        return service_package_capacity(service)

    def get_bookable(self, service):
        from django_app.models import service_is_bookable

        return service_is_bookable(service)

    def get_labor_price(self, service):
        return service.price or 0

    def get_parts_total(self, service):
        from django_app.models import service_package_parts_total

        return service_package_parts_total(service)

    def get_estimated_total(self, service):
        from django_app.models import service_package_parts_total

        return (service.price or 0) + service_package_parts_total(service)

    def get_price(self, service):
        """Catalog display price = labor + package parts (not labor alone)."""
        return self.get_estimated_total(service)

    def get_package_parts(self, service):
        from django_app.models import service_package_items

        rows = []
        for item in service_package_items(service):
            part = item.spare_part
            qty = max(int(item.quantity or 1), 1)
            rows.append(
                {
                    "id": part.id,
                    "name": part.name,
                    "sku": part.part_number,
                    "quantity": qty,
                    "unit_price": part.unit_price,
                    "line_total": (part.unit_price or 0) * qty,
                    "stock": part.quantity,
                }
            )
        return rows


class CustomerServiceViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerServiceSerializer
    queryset = Service.objects.none()

    def get_queryset(self):
        return (
            Service.objects.filter(status="ACTIVE")
            .select_related("category")
            .prefetch_related("package_items__spare_part")
            .order_by("name")
        )


class PublicServiceList(APIView):
    """Active service catalog for the public website. No customer records."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = (
            Service.objects.filter(status="ACTIVE")
            .select_related("category")
            .prefetch_related("package_items__spare_part")
            .order_by("name")
        )
        return Response(CustomerServiceSerializer(rows, many=True, context={"request": request}).data)


class PublicBlogPostSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author_name")
    image = serializers.SerializerMethodField()
    readTime = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    tips = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "slug",
            "category",
            "title",
            "excerpt",
            "readTime",
            "date",
            "author",
            "image",
            "featured",
            "body",
            "tips",
        ]

    def get_image(self, post):
        return absolute_media_url(self, post.image)

    def get_readTime(self, post):
        return f"{post.read_minutes} min"

    def get_date(self, post):
        if not post.published_at:
            return ""
        return post.published_at.strftime("%d %b %Y").lstrip("0")

    def get_body(self, post):
        return [part.strip() for part in post.body.split("\n\n") if part.strip()]

    def get_tips(self, post):
        return [line.strip() for line in post.tips.splitlines() if line.strip()]


class PublicBlogList(APIView):
    """Published articles for visitors. Drafts are not included."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = BlogPost.objects.filter(published=True)
        return Response(PublicBlogPostSerializer(rows, many=True, context={"request": request}).data)


class CustomerInvoiceSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate", read_only=True)
    vehicle_title = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()
    amount_pending = serializers.SerializerMethodField()
    payment_state = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    mechanic_name = serializers.SerializerMethodField()
    booking_date = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()
    note = serializers.SerializerMethodField()
    parts = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "number",
            "vehicle",
            "vehicle_plate",
            "vehicle_title",
            "repair_job",
            "service_name",
            "mechanic_name",
            "booking_date",
            "due_date",
            "note",
            "labor_cost",
            "service_cost",
            "parts_cost",
            "parts",
            "discount",
            "tax",
            "subtotal",
            "grand_total",
            "invoice_date",
            "status",
            "payment_state",
            "amount_paid",
            "amount_pending",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        if instance.status != Invoice.Status.CANCELLED and instance.repair_job_id:
            sync_invoice_costs(instance.repair_job)
            instance.refresh_from_db()
        return super().to_representation(instance)

    def get_payment_state(self, invoice):
        return invoice_payment_state(invoice)

    def get_amount_paid(self, invoice):
        return verified_payment_total(invoice)

    def get_amount_pending(self, invoice):
        total = invoice.payments.filter(status=Payment.Status.PENDING).aggregate(total=Sum("amount"))["total"]
        return total or 0

    def get_vehicle_title(self, invoice):
        vehicle = invoice.vehicle
        return f"{vehicle.brand} {vehicle.model} ({vehicle.year})"

    def get_service_name(self, invoice):
        booking = self._booking(invoice)
        if booking is None or not booking.service_id:
            return ""
        if (booking.note or "").startswith("Opened from PR-"):
            return "Requested part"
        names = [booking.service.name]
        names.extend(booking.added_services.values_list("service__name", flat=True))
        return ", ".join(names)

    def get_mechanic_name(self, invoice):
        job = invoice.repair_job
        if job is None or not job.mechanic_id or not job.mechanic.user_id:
            return ""
        user = job.mechanic.user
        return user.get_full_name() or user.username

    def get_booking_date(self, invoice):
        booking = self._booking(invoice)
        if booking is None or not booking.booking_date:
            return None
        return booking.booking_date.isoformat()

    def get_due_date(self, invoice):
        job = invoice.repair_job
        if job is None or not job.estimated_end:
            return None
        return job.estimated_end.isoformat()

    def get_note(self, invoice):
        job = invoice.repair_job
        if job is None:
            return ""
        parts = [job.problem] if job.problem else []
        return "\n".join(parts)

    def get_parts(self, invoice):
        job = invoice.repair_job
        if job is None:
            return []
        booking = self._booking(invoice)
        booked_on = booking.booking_date if booking else None
        rows = []
        for usage in job.parts_used.all():
            used_day = usage.used_at.date() if usage.used_at else None
            rows.append(
                {
                    "id": usage.id,
                    "part_name": usage.spare_part.name,
                    "part_number": usage.spare_part.part_number,
                    "quantity": usage.quantity,
                    "unit_price": usage.unit_price,
                    "total": usage.total,
                    "used_at": usage.used_at.isoformat() if usage.used_at else None,
                    "added_after_booking": bool(booked_on and used_day and used_day > booked_on),
                    "requested": False,
                }
            )
        for request_row in visit_open_part_requests(job):
            part = request_row.spare_part
            rows.append(
                {
                    "id": f"req-{request_row.id}",
                    "part_name": part.name,
                    "part_number": part.part_number,
                    "quantity": 1,
                    "unit_price": part.unit_price,
                    "total": part.unit_price,
                    "used_at": None,
                    "added_after_booking": True,
                    "requested": True,
                }
            )
        return rows

    def _booking(self, invoice):
        job = invoice.repair_job
        if job is None or not job.booking_id:
            return None
        return job.booking


class CustomerInvoiceViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerInvoiceSerializer
    queryset = Invoice.objects.none()

    def get_queryset(self):
        return (
            Invoice.objects.filter(customer=self.customer)
            .select_related("vehicle", "repair_job__booking__service", "repair_job__mechanic__user")
            .prefetch_related(
                "payments",
                "repair_job__parts_used__spare_part",
                "repair_job__part_requests__spare_part",
                "repair_job__booking__part_requests__spare_part",
            )
            .order_by("-invoice_date", "-id")
        )


class CustomerPaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.number", read_only=True)
    proof_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "number",
            "invoice",
            "invoice_number",
            "amount",
            "method",
            "paid_at",
            "reference",
            "proof_url",
            "status",
            "receipt_number",
            "verified_at",
        ]
        read_only_fields = fields

    def get_proof_url(self, payment):
        return absolute_media_url(self, payment.proof_image)


class CustomerPaymentClaimSerializer(serializers.Serializer):
    invoice = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    reference = serializers.CharField(required=False, allow_blank=True, max_length=80)
    paid_at = serializers.DateField(required=False)
    proof = serializers.ImageField(required=False, allow_null=True)

    def validate_proof(self, value):
        if value in (None, ""):
            return value
        validate_uploaded_image(value)
        return value

    def validate(self, attrs):
        customer = self.context["customer"]
        invoice = Invoice.objects.filter(pk=attrs["invoice"], customer=customer).first()
        if invoice is None:
            raise serializers.ValidationError({"invoice": "Invoice was not found."})
        if invoice.status in (Invoice.Status.CANCELLED, Invoice.Status.DRAFT):
            raise serializers.ValidationError({"invoice": "This invoice cannot accept payments yet."})
        if invoice.status == Invoice.Status.PAID:
            raise serializers.ValidationError({"invoice": "This invoice is already paid."})
        amount = attrs["amount"]
        if amount <= 0:
            raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})
        remain = (invoice.grand_total - claimed_payment_total(invoice)).quantize(Decimal("0.01"))
        amount = Decimal(amount).quantize(Decimal("0.01"))
        attrs["amount"] = amount
        if amount > remain:
            raise serializers.ValidationError(
                {
                    "amount": (
                        f"Amount is too much. Pay exactly ${remain} "
                        f"(you entered ${amount})."
                    )
                }
            )
        if amount < remain:
            raise serializers.ValidationError(
                {
                    "amount": (
                        f"Amount is too little. Pay exactly ${remain} "
                        f"(you entered ${amount})."
                    )
                }
            )
        method = attrs["method"]
        proof = attrs.get("proof")
        # Digital methods require a transaction image from the customer.
        if method in (Payment.Method.CARD, Payment.Method.QR, Payment.Method.BANK) and not proof:
            raise serializers.ValidationError(
                {"proof": "Upload your transaction screenshot for card, QR, or bank transfer."}
            )
        # Cash is paid at the counter — customer may open a claim without proof; staff uploads the bill.
        attrs["invoice_obj"] = invoice
        return attrs


class CustomerPaymentViewSet(CustomerApiMixin, viewsets.ModelViewSet):
    serializer_class = CustomerPaymentSerializer
    queryset = Payment.objects.none()
    http_method_names = ["get", "post", "head", "options"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Payment.objects.filter(customer=self.customer).select_related("invoice").order_by("-paid_at", "-id")

    def get_serializer_class(self):
        if self.action == "create":
            return CustomerPaymentClaimSerializer
        return CustomerPaymentSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if "proof" not in data and request.FILES.get("proof"):
            data["proof"] = request.FILES["proof"]
        serializer = CustomerPaymentClaimSerializer(data=data, context={"customer": self.customer, "request": request})
        serializer.is_valid(raise_exception=True)
        invoice = serializer.validated_data["invoice_obj"]
        paid_at = serializer.validated_data.get("paid_at") or timezone.localdate()
        payment = Payment(
            number=next_payment_number(),
            invoice=invoice,
            customer=self.customer,
            vehicle=invoice.vehicle,
            amount=serializer.validated_data["amount"],
            method=serializer.validated_data["method"],
            paid_at=paid_at,
            reference=(serializer.validated_data.get("reference") or "").strip(),
            status=Payment.Status.PENDING,
        )
        proof = serializer.validated_data.get("proof")
        if proof:
            payment.proof_image = proof
        payment.save()
        from django_app.models import notify_customer
        from django_app.telegram_bot import format_customer_alert, money_text

        method = payment.get_method_display()
        notify_customer(
            self.customer,
            kind=Notification.Kind.PAYMENT,
            title=f"Payment submitted · {payment.number}",
            message=(
                f"Your {method.lower()} payment of {money_text(payment.amount)} "
                f"for {invoice.number} is waiting for garage confirmation."
            ),
            telegram_text=format_customer_alert(
                emoji="💳",
                title="Payment submitted",
                customer=self.customer,
                fields=[
                    f"🧾 Invoice: {invoice.number}",
                    f"🆔 Payment: {payment.number}",
                    f"💵 Amount: {money_text(payment.amount)}",
                    f"💳 Method: {method}",
                ],
                body=[
                    "We received your payment. The garage is checking it.",
                    "We’ll message you when it’s confirmed.",
                ],
            ),
        )
        out = CustomerPaymentSerializer(payment, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        """Customer cancels a pending claim (wrong proof, etc.) so they can pay again."""
        payment = self.get_object()
        payment_id = payment.id
        invoice_id = payment.invoice_id
        try:
            invoice = withdraw_pending_payment(payment, customer=self.customer)
        except ValidationError as exc:
            message = exc.messages[0] if getattr(exc, "messages", None) else str(exc)
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "ok": True,
                "withdrawn_payment_id": payment_id,
                "invoice": invoice.id if invoice else invoice_id,
                "payment_state": invoice_payment_state(invoice) if invoice else "UNPAID",
                "detail": "Pending payment removed. You can submit a new payment.",
            }
        )


class CustomerPartSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SparePart
        fields = [
            "id",
            "part_number",
            "name",
            "brand",
            "unit_price",
            "quantity",
            "category_name",
            "image_url",
        ]
        read_only_fields = fields

    def get_image_url(self, part):
        return absolute_media_url(self, part.image)


class CustomerPartViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerPartSerializer
    queryset = SparePart.objects.none()

    def get_queryset(self):
        return SparePart.objects.filter(status=SparePart.Status.ACTIVE).select_related("category").order_by("name")


class CustomerPartRequestSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="spare_part.name", read_only=True)
    part_number = serializers.CharField(source="spare_part.part_number", read_only=True)
    unit_price = serializers.DecimalField(source="spare_part.unit_price", max_digits=12, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()
    vehicle_title = serializers.SerializerMethodField()
    work_order_number = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    invoice_status = serializers.SerializerMethodField()
    invoice_total = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()
    can_withdraw = serializers.SerializerMethodField()
    issued = serializers.SerializerMethodField()

    class Meta:
        model = PartRequest
        fields = [
            "id",
            "number",
            "spare_part",
            "part_name",
            "part_number",
            "unit_price",
            "line_total",
            "quantity",
            "source",
            "vehicle",
            "booking",
            "vehicle_plate",
            "vehicle_title",
            "fulfillment",
            "notes",
            "cancel_reason",
            "status",
            "created_at",
            "work_order_number",
            "invoice_number",
            "invoice_status",
            "invoice_total",
            "amount_paid",
            "can_withdraw",
            "issued",
        ]
        read_only_fields = [
            "number",
            "part_name",
            "part_number",
            "unit_price",
            "line_total",
            "source",
            "vehicle_plate",
            "vehicle_title",
            "cancel_reason",
            "status",
            "created_at",
            "work_order_number",
            "invoice_number",
            "invoice_status",
            "invoice_total",
            "amount_paid",
            "can_withdraw",
            "issued",
        ]
        extra_kwargs = {
            "vehicle": {"required": False, "allow_null": True},
            "booking": {"required": False, "allow_null": True},
            "notes": {"required": False, "allow_blank": True},
            "quantity": {"required": False},
        }

    def get_line_total(self, request_row):
        qty = max(int(request_row.quantity or 1), 1)
        return Decimal(request_row.spare_part.unit_price or 0) * qty

    def get_vehicle_plate(self, request_row):
        return request_row.vehicle.plate if request_row.vehicle_id else ""

    def get_vehicle_title(self, request_row):
        vehicle = request_row.vehicle
        if not vehicle:
            return ""
        return f"{vehicle.brand} {vehicle.model}"

    def _invoice(self, request_row):
        job = request_row.repair_job
        if job is None:
            return None
        try:
            return job.invoice
        except Invoice.DoesNotExist:
            return None

    def get_work_order_number(self, request_row):
        if not request_row.repair_job_id:
            return ""
        return f"WO-{request_row.repair_job_id:04d}"

    def get_invoice_number(self, request_row):
        invoice = self._invoice(request_row)
        return invoice.number if invoice else ""

    def get_invoice_status(self, request_row):
        invoice = self._invoice(request_row)
        return invoice.status if invoice else ""

    def get_invoice_total(self, request_row):
        invoice = self._invoice(request_row)
        return invoice.grand_total if invoice else Decimal("0")

    def get_amount_paid(self, request_row):
        invoice = self._invoice(request_row)
        if invoice is None:
            return Decimal("0")
        total = invoice.payments.exclude(
            status__in=(Payment.Status.FAILED, Payment.Status.REFUNDED)
        ).aggregate(total=Sum("amount"))["total"]
        return total or Decimal("0")

    def get_can_withdraw(self, request_row):
        return part_request_can_withdraw(request_row)

    def get_issued(self, request_row):
        return bool(request_row.parts_usage_id)

    def validate_vehicle(self, vehicle):
        if vehicle is None:
            return vehicle
        if vehicle.customer_id != self.context["request"].user.customer.id:
            raise serializers.ValidationError("Choose one of your vehicles.")
        return vehicle

    def validate_booking(self, booking):
        if booking is None:
            return booking
        if booking.customer_id != self.context["request"].user.customer.id:
            raise serializers.ValidationError("Choose one of your visits.")
        if booking.status not in OPEN_VISIT:
            raise serializers.ValidationError("This visit is closed.")
        return booking

    def validate_spare_part(self, part):
        if part.status != SparePart.Status.ACTIVE:
            raise serializers.ValidationError("That part is not available.")
        if (part.quantity or 0) < 1:
            raise serializers.ValidationError("That part is out of stock.")
        return part

    def validate(self, attrs):
        attrs = super().validate(attrs)
        part = attrs.get("spare_part")
        qty = max(int(attrs.get("quantity") or 1), 1)
        attrs["quantity"] = qty
        if part is not None and (part.quantity or 0) < qty:
            raise serializers.ValidationError({"quantity": f"Only {part.quantity} of {part.name} are in stock."})
        return attrs

    def create(self, validated_data):
        customer = self.context["request"].user.customer
        vehicle = validated_data.get("vehicle")
        booking = validated_data.get("booking")
        fulfillment = validated_data.get("fulfillment") or PartRequest.Fulfillment.INSTALL
        validated_data["source"] = PartRequest.Source.CUSTOMER
        validated_data["quantity"] = max(int(validated_data.get("quantity") or 1), 1)
        if booking is not None and vehicle is None:
            validated_data["vehicle"] = booking.vehicle
            vehicle = booking.vehicle
        if booking is not None and vehicle is not None and booking.vehicle_id != vehicle.id:
            raise serializers.ValidationError({"booking": "That visit is for a different vehicle."})
        # Workshop install joins the open repair visit. Pickup/delivery stay parts-only.
        if vehicle is not None and booking is None and fulfillment == PartRequest.Fulfillment.INSTALL:
            validated_data["booking"] = open_visit_for(customer, vehicle)
        if fulfillment in (PartRequest.Fulfillment.PICKUP, PartRequest.Fulfillment.DELIVERY):
            validated_data["booking"] = None
        row = PartRequest.objects.create(customer=customer, **validated_data)
        job = row.repair_job
        booking = row.booking
        if job is None and booking is not None:
            try:
                job = booking.repair_job
            except RepairJob.DoesNotExist:
                job = None
        if job is not None:
            sync_invoice_costs(job)
        from django_app.telegram_bot import format_customer_alert

        part_name = row.spare_part.name if row.spare_part_id else "Part"
        plate = row.vehicle.plate if row.vehicle_id else "your car"
        notify_customer(
            customer,
            kind=Notification.Kind.INVOICE,
            title=f"Part request {row.number}",
            message=(
                f"Your request for {part_name} ({row.get_fulfillment_display().lower()}) "
                f"for {plate} was received."
            ),
            telegram_text=format_customer_alert(
                emoji="📦",
                title="Part request received",
                customer=customer,
                fields=[
                    f"📦 Part: {part_name}",
                    f"🆔 Request: {row.number}",
                    f"🚗 Car: {plate}",
                    f"🚚 How: {row.get_fulfillment_display()}",
                ],
                body=[
                    "We got your part request.",
                    "We’ll message you when the garage notes or confirms it.",
                ],
            ),
        )
        return row


class CustomerPartRequestViewSet(CustomerApiMixin, viewsets.ModelViewSet):
    serializer_class = CustomerPartRequestSerializer
    queryset = PartRequest.objects.none()
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return (
            PartRequest.objects.filter(customer=self.customer)
            .select_related("spare_part", "vehicle", "booking", "repair_job__invoice")
            .prefetch_related("repair_job__invoice__payments")
            .order_by("-created_at", "-id")
        )

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        row = self.get_object()
        try:
            withdraw_part_request(row)
        except ValidationError as exc:
            message = exc.messages[0] if getattr(exc, "messages", None) else "This part request can no longer be removed."
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="confirm-purchase")
    def confirm_purchase(self, request, pk=None):
        row = self.get_object()
        try:
            confirm_customer_part_purchase(row)
        except ValidationError as exc:
            message = exc.messages[0] if getattr(exc, "messages", None) else "This purchase could not be confirmed."
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        row = self.get_queryset().get(pk=row.pk)
        return Response(self.get_serializer(row).data)


class CustomerHistorySerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate", read_only=True)
    mechanic_name = serializers.SerializerMethodField()
    mechanic_photo = serializers.SerializerMethodField()
    inspector_name = serializers.SerializerMethodField()
    inspector_photo = serializers.SerializerMethodField()
    mileage = serializers.SerializerMethodField()
    parts_used = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = RepairJob
        fields = [
            "id",
            "vehicle",
            "vehicle_plate",
            "problem",
            "status",
            "start_date",
            "mechanic_name",
            "mechanic_photo",
            "inspector_name",
            "inspector_photo",
            "mileage",
            "parts_used",
            "total_cost",
        ]
        read_only_fields = fields

    def get_mechanic_name(self, job):
        if not job.mechanic_id or not job.mechanic.user_id:
            return ""
        return account_name(job.mechanic.user)

    def get_mechanic_photo(self, job):
        if not job.mechanic_id or not job.mechanic.user_id:
            return ""
        return account_photo(self, job.mechanic.user)

    def get_inspector_name(self, job):
        return account_name(inspection_staff_user(job))

    def get_inspector_photo(self, job):
        return account_photo(self, inspection_staff_user(job))

    def get_mileage(self, job):
        inspection = None
        try:
            inspection = job.inspection
        except ObjectDoesNotExist:
            inspection = None
        if inspection is not None:
            return inspection.mileage
        return job.vehicle.mileage

    def get_parts_used(self, job):
        return ", ".join(f"{usage.spare_part.name} x{usage.quantity}" for usage in job.parts_used.all())

    def get_total_cost(self, job):
        try:
            return job.invoice.grand_total
        except Invoice.DoesNotExist:
            return None


class CustomerHistoryViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    """Completed repair jobs are the vehicle service history."""

    serializer_class = CustomerHistorySerializer
    queryset = RepairJob.objects.none()

    def get_queryset(self):
        return (
            RepairJob.objects.filter(customer=self.customer, status=RepairJob.Status.COMPLETED)
            .select_related("vehicle", "mechanic__user", "invoice", "inspection__staff__user")
            .prefetch_related("parts_used__spare_part")
            .order_by("-start_date", "-id")
        )


class CustomerEstimateSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate", read_only=True)
    vehicle_info = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    parts = serializers.SerializerMethodField()

    class Meta:
        model = Estimate
        fields = [
            "id",
            "number",
            "vehicle",
            "vehicle_plate",
            "vehicle_info",
            "repair_job",
            "description",
            "service_name",
            "labor_cost",
            "service_cost",
            "parts_cost",
            "parts",
            "discount",
            "tax",
            "status",
            "decision_note",
            "decided_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_vehicle_info(self, estimate):
        vehicle = estimate.vehicle
        return f"{vehicle.brand} {vehicle.model} ({vehicle.plate})"

    def get_service_name(self, estimate):
        job = estimate.repair_job
        if job is None or not job.booking_id or not job.booking.service_id:
            return ""
        return job.booking.service.name

    def get_parts(self, estimate):
        job = estimate.repair_job
        if job is None:
            return []
        return [
            {
                "id": usage.id,
                "part_name": usage.spare_part.name,
                "part_number": usage.spare_part.part_number,
                "quantity": usage.quantity,
                "unit_price": usage.unit_price,
                "total": usage.total,
            }
            for usage in job.parts_used.all()
        ]


class CustomerEstimateViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerEstimateSerializer
    queryset = Estimate.objects.none()

    def get_queryset(self):
        return (
            Estimate.objects.filter(customer=self.customer)
            .select_related("vehicle", "repair_job__booking__service")
            .prefetch_related("repair_job__parts_used__spare_part")
        )

    def _decide(self, request, new_status):
        estimate = self.get_object()
        if estimate.status != Estimate.Status.SENT:
            return Response(
                {"ok": False, "error": "This quotation is no longer waiting for a decision."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        estimate.status = new_status
        estimate.decision_note = str(request.data.get("note") or "")[:2000]
        estimate.decided_at = timezone.now()
        estimate.save()
        return Response(self.get_serializer(estimate).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._decide(request, Estimate.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._decide(request, Estimate.Status.REJECTED)


class CustomerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "message", "read", "created_at"]
        read_only_fields = fields


class CustomerNotificationViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerNotificationSerializer
    queryset = Notification.objects.none()

    def get_queryset(self):
        return Notification.objects.filter(customer=self.customer)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        note = self.get_object()
        if not note.read:
            note.read = True
            note.save(update_fields=["read"])
        return Response(self.get_serializer(note).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        self.get_queryset().filter(read=False).update(read=True)
        return Response({"ok": True})

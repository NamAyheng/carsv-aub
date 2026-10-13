from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django_app.models import (
    BlogPost,
    Booking,
    add_booking_service,
    booking_slot_taken,
    cancel_booking,
    confirm_customer_repair,
    decline_repair,
    open_visit_for,
    OPEN_VISIT,
    confirm_customer_part_purchase,
    part_request_can_withdraw,
    remove_booking_extra_service,
    sync_invoice_costs,
    sync_vehicle_shop_status,
    visit_open_part_requests,
    withdraw_part_request,
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
        serializer.save(customer=self.customer, status=Vehicle.Status.ACTIVE)

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
        if vehicle and booking_date and _conflict(vehicle, booking_date, booking_time, ignore_pk=getattr(self.instance, "pk", None)):
            raise serializers.ValidationError({"booking_time": "That vehicle already has a booking at this time."})
        return attrs

    def get_services(self, booking):
        rows = []
        if booking.service_id:
            rows.append(
                {
                    "id": None,
                    "name": booking.service.name,
                    "price": booking.service.price,
                    "primary": True,
                }
            )
        for extra in booking.added_services.all():
            rows.append(
                {
                    "id": extra.id,
                    "name": extra.service.name,
                    "price": extra.price,
                    "primary": False,
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
        when = booking.booking_date.isoformat()
        if booking.booking_time:
            when = f"{when} {booking.booking_time.strftime('%H:%M')}"
        Notification.objects.create(
            customer=self.customer,
            kind=Notification.Kind.BOOKING,
            title="Booking received",
            message=f"{booking.service.name} for {booking.vehicle.plate} on {when} is pending confirmation.",
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
        request = self.context.get("request")
        urls = []
        for shot in inspection.images.all():
            if not shot.image:
                continue
            url = shot.image.url
            if request is not None:
                url = request.build_absolute_uri(url)
            urls.append(url)
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
                }
            )
        for extra in booking.added_services.all():
            rows.append(
                {
                    "id": extra.id,
                    "name": extra.service.name,
                    "price": extra.price,
                    "primary": False,
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
    if not field:
        return ""
    request = serializer.context.get("request")
    url = field.url
    if request is None:
        return url
    return request.build_absolute_uri(url)


class CustomerServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ["id", "name", "description", "price", "duration_minutes", "category", "category_name", "image_url"]

    def get_image_url(self, service):
        return absolute_media_url(self, service.image)


class CustomerServiceViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerServiceSerializer
    queryset = Service.objects.none()

    def get_queryset(self):
        return Service.objects.filter(status="ACTIVE").select_related("category").order_by("name")


class PublicServiceList(APIView):
    """Active service catalog for the public website. No customer records."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = Service.objects.filter(status="ACTIVE").select_related("category").order_by("name")
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
            "amount_paid",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        if instance.status != Invoice.Status.CANCELLED and instance.repair_job_id:
            sync_invoice_costs(instance.repair_job)
            instance.refresh_from_db()
        return super().to_representation(instance)

    def get_amount_paid(self, invoice):
        total = invoice.payments.filter(status=Payment.Status.PAID).aggregate(total=Sum("amount"))["total"]
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
            "status",
            "receipt_number",
        ]
        read_only_fields = fields


class CustomerPaymentViewSet(CustomerApiMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerPaymentSerializer
    queryset = Payment.objects.none()

    def get_queryset(self):
        return Payment.objects.filter(customer=self.customer).select_related("invoice").order_by("-paid_at", "-id")


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
        }

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
        return part

    def create(self, validated_data):
        customer = self.context["request"].user.customer
        vehicle = validated_data.get("vehicle")
        booking = validated_data.get("booking")
        fulfillment = validated_data.get("fulfillment") or PartRequest.Fulfillment.INSTALL
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

from rest_framework import serializers

from django_app.models import (
    Booking,
    Customer,
    Inspection,
    Invoice,
    Mechanic,
    PartsUsage,
    Payment,
    RepairJob,
    Service,
    ServiceCategory,
    SparePart,
    SparePartCategory,
    Staff,
    User as AppUser,
    Vehicle,
)


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = AppUser
        fields = [
            "url",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "status",
            "groups",
        ]


class CustomerSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Customer
        fields = ["url", "user", "name", "gender", "phone", "email", "address", "photo", "status"]


class VehicleSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "url",
            "customer",
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
        ]


class ServiceCategorySerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["url", "name", "status"]


class ServiceSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Service
        fields = ["url", "category", "name", "description", "price", "duration_minutes", "status"]


class BookingSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "url",
            "customer",
            "vehicle",
            "service",
            "booking_date",
            "booking_time",
            "problem",
            "note",
            "status",
            "cancel_reason",
            "cancelled_at",
            "cancelled_by",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class StaffSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Staff
        fields = ["url", "user", "department", "position", "status"]


class InspectionSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Inspection
        fields = [
            "url",
            "booking",
            "mileage",
            "fuel_level",
            "front_brake_mm",
            "rear_brake_mm",
            "tire_tread_mm",
            "condition",
            "damage",
            "complaint",
            "note",
            "photos",
            "checked_in_at",
            "staff",
        ]
        read_only_fields = ["checked_in_at"]


class MechanicSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Mechanic
        fields = ["url", "user", "skills", "specialization", "available", "status"]


class RepairJobSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = RepairJob
        fields = [
            "url",
            "booking",
            "customer",
            "vehicle",
            "mechanic",
            "problem",
            "diagnosis",
            "start_date",
            "estimated_end",
            "status",
            "progress",
        ]


class SparePartCategorySerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = SparePartCategory
        fields = ["url", "name", "status"]


class SparePartSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = SparePart
        fields = [
            "url",
            "part_number",
            "name",
            "category",
            "brand",
            "unit_price",
            "quantity",
            "min_stock",
            "status",
        ]


class PartsUsageSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = PartsUsage
        fields = [
            "url",
            "repair_job",
            "spare_part",
            "quantity",
            "unit_price",
            "total",
            "used_at",
            "recorded_by",
        ]
        read_only_fields = ["total", "used_at"]


class InvoiceSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "url",
            "number",
            "customer",
            "vehicle",
            "repair_job",
            "labor_cost",
            "service_cost",
            "parts_cost",
            "discount",
            "tax",
            "subtotal",
            "grand_total",
            "invoice_date",
            "status",
        ]
        read_only_fields = ["subtotal", "grand_total", "invoice_date"]


class PaymentSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "url",
            "number",
            "invoice",
            "customer",
            "amount",
            "method",
            "paid_at",
            "reference",
            "received_by",
            "status",
            "receipt_number",
        ]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

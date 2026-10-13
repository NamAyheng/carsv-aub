from django.contrib.auth import get_user_model
from rest_framework import viewsets

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
    Vehicle,
)
from django_app.serializers import (
    BookingSerializer,
    CustomerSerializer,
    InspectionSerializer,
    InvoiceSerializer,
    MechanicSerializer,
    PartsUsageSerializer,
    PaymentSerializer,
    RepairJobSerializer,
    ServiceCategorySerializer,
    ServiceSerializer,
    SparePartCategorySerializer,
    SparePartSerializer,
    StaffSerializer,
    UserSerializer,
    VehicleSerializer,
)

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("name")
    serializer_class = CustomerSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by("plate")
    serializer_class = VehicleSerializer


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all().order_by("name")
    serializer_class = ServiceCategorySerializer


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all().order_by("name")
    serializer_class = ServiceSerializer


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all().order_by("id")
    serializer_class = StaffSerializer


class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer


class MechanicViewSet(viewsets.ModelViewSet):
    queryset = Mechanic.objects.all()
    serializer_class = MechanicSerializer


class RepairJobViewSet(viewsets.ModelViewSet):
    queryset = RepairJob.objects.all()
    serializer_class = RepairJobSerializer


class SparePartCategoryViewSet(viewsets.ModelViewSet):
    queryset = SparePartCategory.objects.all().order_by("name")
    serializer_class = SparePartCategorySerializer


class SparePartViewSet(viewsets.ModelViewSet):
    queryset = SparePart.objects.all().order_by("name")
    serializer_class = SparePartSerializer


class PartsUsageViewSet(viewsets.ModelViewSet):
    queryset = PartsUsage.objects.all()
    serializer_class = PartsUsageSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

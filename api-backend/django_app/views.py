from django.contrib.auth import authenticate, get_user_model
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

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
    LoginSerializer,
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


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip()
        password = serializer.validated_data["password"]

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return Response(
                {"ok": False, "error": "No account with this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        authed = authenticate(request, username=user.username, password=password)
        if authed is None:
            return Response(
                {"ok": False, "error": "Wrong password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = authed.get_full_name() or authed.username
        return Response({"ok": True, "username": username, "role": authed.role})

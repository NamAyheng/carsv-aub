from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from django_app.views import (
    BookingViewSet,
    CustomerViewSet,
    InspectionViewSet,
    InvoiceViewSet,
    LoginView,
    MechanicViewSet,
    PartsUsageViewSet,
    PaymentViewSet,
    RepairJobViewSet,
    ServiceCategoryViewSet,
    ServiceViewSet,
    SparePartCategoryViewSet,
    SparePartViewSet,
    StaffViewSet,
    UserViewSet,
    VehicleViewSet,
)

router = routers.DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"customers", CustomerViewSet)
router.register(r"vehicles", VehicleViewSet)
router.register(r"service-categories", ServiceCategoryViewSet)
router.register(r"services", ServiceViewSet)
router.register(r"bookings", BookingViewSet)
router.register(r"staff", StaffViewSet)
router.register(r"inspections", InspectionViewSet)
router.register(r"mechanics", MechanicViewSet)
router.register(r"repair-jobs", RepairJobViewSet)
router.register(r"spare-part-categories", SparePartCategoryViewSet)
router.register(r"spare-parts", SparePartViewSet)
router.register(r"parts-usages", PartsUsageViewSet)
router.register(r"invoices", InvoiceViewSet)
router.register(r"payments", PaymentViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("api/login/", LoginView.as_view()),
    path("api/", include(router.urls)),
]

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework import routers

from django_app.auth_api import (
    GoogleLoginView,
    LinkGoogleView,
    LinkTelegramView,
    LogoutView,
    MeView,
    PasswordChangeView,
    PasswordLoginView,
    PasswordResetConfirmView,
    PasswordResetView,
    RefreshView,
    RegisterView,
    ResendVerificationView,
    TelegramLoginView,
    UnlinkProviderView,
    VerifyEmailView,
)
from django_app.customer_api import (
    CustomerBookingViewSet,
    CustomerEstimateViewSet,
    CustomerHistoryViewSet,
    CustomerInspectionViewSet,
    CustomerInvoiceViewSet,
    CustomerNotificationViewSet,
    CustomerPartRequestViewSet,
    CustomerPartViewSet,
    CustomerPaymentViewSet,
    CustomerRepairViewSet,
    CustomerServiceViewSet,
    CustomerVehicleViewSet,
    PublicBlogList,
    PublicServiceList,
)
from django_app.views import (
    BookingViewSet,
    CustomerViewSet,
    InspectionViewSet,
    InvoiceViewSet,
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

customer_router = routers.DefaultRouter()
customer_router.register(r"vehicles", CustomerVehicleViewSet, basename="customer-vehicle")
customer_router.register(r"bookings", CustomerBookingViewSet, basename="customer-booking")
customer_router.register(r"inspections", CustomerInspectionViewSet, basename="customer-inspection")
customer_router.register(r"repairs", CustomerRepairViewSet, basename="customer-repair")
customer_router.register(r"services", CustomerServiceViewSet, basename="customer-service")
customer_router.register(r"invoices", CustomerInvoiceViewSet, basename="customer-invoice")
customer_router.register(r"payments", CustomerPaymentViewSet, basename="customer-payment")
customer_router.register(r"parts", CustomerPartViewSet, basename="customer-part")
customer_router.register(r"part-requests", CustomerPartRequestViewSet, basename="customer-part-request")
customer_router.register(r"history", CustomerHistoryViewSet, basename="customer-history")
customer_router.register(r"estimates", CustomerEstimateViewSet, basename="customer-estimate")
customer_router.register(r"notifications", CustomerNotificationViewSet, basename="customer-notification")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view()),
    path("api/auth/login/", PasswordLoginView.as_view()),
    path("api/auth/logout/", LogoutView.as_view()),
    path("api/auth/token/refresh/", RefreshView.as_view()),
    path("api/auth/me/", MeView.as_view()),
    path("api/auth/google/", GoogleLoginView.as_view()),
    path("api/auth/telegram/", TelegramLoginView.as_view()),
    path("api/auth/link/google/", LinkGoogleView.as_view()),
    path("api/auth/link/telegram/", LinkTelegramView.as_view()),
    path("api/auth/unlink/", UnlinkProviderView.as_view()),
    path("api/auth/verify-email/", VerifyEmailView.as_view()),
    path("api/auth/resend-verification/", ResendVerificationView.as_view()),
    path("api/auth/password-reset/", PasswordResetView.as_view()),
    path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view()),
    path("api/auth/password/change/", PasswordChangeView.as_view()),
    path("api/login/", PasswordLoginView.as_view()),
    path("api/public/services/", PublicServiceList.as_view()),
    path("api/public/blog/", PublicBlogList.as_view()),
    path("api/customer/", include(customer_router.urls)),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

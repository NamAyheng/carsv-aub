from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from django_app.uploads import validate_uploaded_image
from django_app.auth_services import (
    AuthError,
    change_password,
    confirm_password_reset,
    google_login,
    link_provider,
    password_login,
    public_email,
    register_customer,
    request_password_reset,
    resend_verification,
    revoke_refresh,
    rotate_refresh,
    telegram_login,
    unlink_provider,
    verify_email,
    verify_google_id_token,
    verify_telegram_login,
)
from django_app.models import AuthProvider, Customer, User
from django_app.permissions import IsActiveAccount
from django_app.serializers import LoginSerializer


class AuthAnonThrottle(AnonRateThrottle):
    scope = "auth"


class AuthUserThrottle(UserRateThrottle):
    scope = "auth_user"


def _error(exc):
    return Response({"ok": False, "error": exc.message}, status=exc.status_code)


def _with_refresh_cookie(payload, refresh, status_code=status.HTTP_200_OK):
    response = Response(payload, status=status_code)
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite="Lax",
        path=settings.REFRESH_COOKIE_PATH,
    )
    return response


def _clear_refresh_cookie(response):
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite="Lax",
    )
    return response


class AuthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthAnonThrottle, AuthUserThrottle]


class PasswordLoginView(AuthView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload, refresh = password_login(
                serializer.validated_data["identifier"],
                serializer.validated_data["password"],
            )
        except AuthError as exc:
            return _error(exc)
        return _with_refresh_cookie(payload, refresh)


class RegisterView(AuthView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            register_customer(**serializer.validated_data)
        except AuthError as exc:
            return _error(exc)
        return Response(
            {
                "ok": True,
                "detail": "Account created. Check your email for a verification token before signing in.",
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(AuthView):
    def post(self, request):
        revoke_refresh(request.COOKIES.get(settings.REFRESH_COOKIE_NAME))
        return _clear_refresh_cookie(Response({"ok": True}))


class RefreshView(AuthView):
    def post(self, request):
        try:
            payload, refresh = rotate_refresh(request.COOKIES.get(settings.REFRESH_COOKIE_NAME))
        except AuthError as exc:
            return _clear_refresh_cookie(_error(exc))
        return _with_refresh_cookie(payload, refresh)


class VerifyEmailView(AuthView):
    def post(self, request):
        token = str(request.data.get("token") or "")
        try:
            verify_email(token)
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "detail": "Email verified. You can sign in."})


class ResendVerificationView(AuthView):
    def post(self, request):
        try:
            resend_verification(request.data.get("email"))
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "detail": "If that account is waiting for verification, an email has been sent."})


class PasswordResetView(AuthView):
    def post(self, request):
        try:
            request_password_reset(request.data.get("email"))
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "detail": "If that email is registered, a reset token has been sent."})


class PasswordResetConfirmView(AuthView):
    def post(self, request):
        token = str(request.data.get("token") or "")
        password = str(request.data.get("password") or "")
        if not token or not password:
            return Response({"ok": False, "error": "Token and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            confirm_password_reset(token, password)
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "detail": "Password updated. You can sign in."})


class PasswordChangeView(APIView):
    permission_classes = [IsActiveAccount]
    throttle_classes = [AuthUserThrottle]

    def post(self, request):
        try:
            change_password(
                request.user,
                request.data.get("current_password"),
                str(request.data.get("password") or ""),
            )
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "detail": "Password updated."})


class GoogleLoginView(AuthView):
    def post(self, request):
        raw = request.data.get("id_token") or request.data.get("credential")
        try:
            payload, refresh = google_login(verify_google_id_token(raw))
        except AuthError as exc:
            return _error(exc)
        return _with_refresh_cookie(payload, refresh)


class TelegramLoginView(AuthView):
    def post(self, request):
        try:
            payload, refresh = telegram_login(verify_telegram_login(request.data))
        except AuthError as exc:
            return _error(exc)
        return _with_refresh_cookie(payload, refresh)


class LinkGoogleView(APIView):
    permission_classes = [IsActiveAccount]
    throttle_classes = [AuthUserThrottle]

    def post(self, request):
        raw = request.data.get("id_token") or request.data.get("credential")
        try:
            identity = verify_google_id_token(raw)
            link_provider(request.user, AuthProvider.Provider.GOOGLE, identity["sub"])
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "linked": ["google"]})


class LinkTelegramView(APIView):
    permission_classes = [IsActiveAccount]
    throttle_classes = [AuthUserThrottle]

    def post(self, request):
        try:
            identity = verify_telegram_login(request.data)
            link_provider(request.user, AuthProvider.Provider.TELEGRAM, identity["id"])
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "linked": ["telegram"]})


class UnlinkProviderView(APIView):
    permission_classes = [IsActiveAccount]
    throttle_classes = [AuthUserThrottle]

    def post(self, request):
        provider = str(request.data.get("provider") or "").strip().lower()
        if provider not in {AuthProvider.Provider.GOOGLE, AuthProvider.Provider.TELEGRAM}:
            return Response({"ok": False, "error": "Choose google or telegram."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            unlink_provider(request.user, provider)
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True})


def _photo_url(user, customer, request):
    photo = user.photo if user.photo else (customer.photo if customer and customer.photo else None)
    if not photo:
        return ""
    url = photo.url
    if request is None:
        return url
    return request.build_absolute_uri(url)


def profile_payload(user, request=None):
    customer = Customer.objects.filter(user=user).first()
    return {
        "id": user.id,
        "username": user.username,
        "email": public_email(user),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": user.get_full_name() or user.username,
        "phone": user.phone,
        "role": user.role,
        "address": customer.address if customer else "",
        "gender": customer.gender if customer else "",
        "notes": customer.notes if customer else "",
        "has_password": user.has_usable_password(),
        "email_verified": user.email_verified,
        "linked_providers": list(user.auth_providers.values_list("provider", flat=True)),
        "photo_url": _photo_url(user, customer, request),
    }


class ProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)
    address = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=Customer.Gender.choices, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class MeView(APIView):
    permission_classes = [IsActiveAccount]
    throttle_classes = [AuthUserThrottle]

    def get(self, request):
        return Response(profile_payload(request.user, request))

    def patch(self, request):
        serializer = ProfileSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        photo = request.FILES.get("photo")
        if photo:
            try:
                validate_uploaded_image(photo)
            except ValidationError as exc:
                message = exc.messages[0] if exc.messages else "Upload a JPG, PNG, WEBP, or GIF image."
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
            user.photo.save(photo.name, photo, save=False)
        for field in ("first_name", "last_name", "phone"):
            if field in data:
                setattr(user, field, data[field])
        user.role = User.objects.filter(pk=user.pk).values_list("role", flat=True).first()
        user.is_staff = User.objects.filter(pk=user.pk).values_list("is_staff", flat=True).first()
        user.is_superuser = User.objects.filter(pk=user.pk).values_list("is_superuser", flat=True).first()
        user.save()
        customer = Customer.objects.filter(user=user).first()
        if customer:
            for field in ("address", "gender", "notes"):
                if field in data:
                    setattr(customer, field, data[field])
            if user.photo:
                customer.photo = user.photo.name
            customer.save()
        return Response(profile_payload(user, request))


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)

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
    verify_email_otp,
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


_SECRET_RESPONSE_KEYS = frozenset(
    {"verification_token", "token", "password", "current_password", "new_password", "otp", "otp_code"}
)


def _error(exc):
    payload = {"ok": False, "error": exc.message}
    extra = getattr(exc, "extra", None) or {}
    for key, value in extra.items():
        if key in _SECRET_RESPONSE_KEYS:
            continue
        if value not in (None, ""):
            payload[key] = value
    return Response(payload, status=exc.status_code)


def _with_refresh_cookie(payload, refresh, status_code=status.HTTP_200_OK):
    response = Response(payload, status=status_code)
    samesite = getattr(settings, "REFRESH_COOKIE_SAMESITE", "Lax")
    secure = settings.REFRESH_COOKIE_SECURE or samesite == "None"
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path=settings.REFRESH_COOKIE_PATH,
    )
    return response


def _clear_refresh_cookie(response):
    samesite = getattr(settings, "REFRESH_COOKIE_SAMESITE", "Lax")
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=samesite,
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
            _user, email_sent = register_customer(**serializer.validated_data)
        except AuthError as exc:
            return _error(exc)
        email = serializer.validated_data["email"].strip().lower()
        if email_sent:
            detail = (
                "Your account has been created. Enter the 6-digit code we sent to your email "
                "to verify your address before logging in."
            )
        else:
            detail = (
                "Your account was created, but the verification email could not be delivered. "
                "Use Resend on the next screen, or ask an admin to verify the account."
            )
        return Response(
            {
                "ok": True,
                "email_sent": email_sent,
                "detail": detail,
                "email": email,
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
        email = str(request.data.get("email") or "")
        code = str(request.data.get("code") or request.data.get("otp") or "")
        if request.data.get("token"):
            return Response(
                {
                    "ok": False,
                    "error": "Link verification is no longer used. Enter the 6-digit code from your email.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            verify_email_otp(email, code)
        except AuthError as exc:
            return _error(exc)
        return Response({"ok": True, "detail": "Email verified. You can sign in."})


class ResendVerificationView(AuthView):
    def post(self, request):
        try:
            resend_verification(request.data.get("email"))
        except AuthError as exc:
            return _error(exc)
        return Response(
            {
                "ok": True,
                "detail": "If that account is waiting for verification, a new code has been sent.",
                "resend_cooldown_seconds": int(
                    getattr(settings, "EMAIL_VERIFY_RESEND_COOLDOWN", 60) or 60
                ),
            }
        )


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


class PublicAuthConfigView(AuthView):
    """Client IDs safe to expose to the browser (no secrets)."""

    def get(self, request):
        return Response(
            {
                "ok": True,
                "google_client_id": getattr(settings, "GOOGLE_CLIENT_ID", "") or "",
                "telegram_bot_username": (getattr(settings, "TELEGRAM_BOT_USERNAME", "") or "").lstrip("@"),
            }
        )


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
            # Require Google-verified email to match this account (no email-string takeover).
            if not request.user.email_is_placeholder:
                account_email = (request.user.email or "").strip().lower()
                if not account_email or identity["email"] != account_email:
                    raise AuthError(
                        "That Google account email does not match this CarSV account.",
                        400,
                    )
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
            customer = Customer.objects.filter(user=request.user).first()
            if customer is not None:
                from django_app.telegram_bot import (
                    TelegramBindError,
                    bind_customer_chat,
                    send_message,
                )

                username = identity.get("username") or ""
                # Bind first (1 Telegram ↔ 1 customer). Refuses steal; keeps original owner.
                try:
                    bind_customer_chat(customer, identity["id"], telegram_username=username)
                except TelegramBindError as exc:
                    return Response(
                        {"ok": False, "error": exc.message.replace("\n", " ").strip()},
                        status=status.HTTP_409_CONFLICT,
                    )
                from django_app.telegram_bot import customer_display_name, customer_email

                lines = [
                    "✅ CarSV · Telegram linked",
                    "",
                    f"👤 {customer_display_name(customer)}",
                ]
                email = customer_email(customer)
                if email:
                    lines.append(f"📧 {email}")
                lines.extend(
                    [
                        "",
                        "🔔 Alerts for this account will arrive here only.",
                        "",
                        "Wrong account? Disconnect in CarSV Profile first.",
                    ]
                )
                send_message(identity["id"], "\n".join(lines))
            else:
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
    from django_app.media_serving import media_url_path

    return media_url_path(getattr(photo, "name", None) or photo.url or "")


def profile_payload(user, request=None):
    customer = Customer.objects.filter(user=user).first()
    from django_app.telegram_bot import bot_configured, bot_username

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
        "telegram_bot_configured": bot_configured() and bool(bot_username()),
        "telegram_linked": bool(customer and customer.telegram_chat_id),
        "telegram_username": (customer.telegram_username or "").strip() if customer else "",
        "telegram_alerts": bool(customer.telegram_alerts) if customer else True,
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
        customer = Customer.objects.filter(user=user).first()
        before = {
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "phone": user.phone or "",
            "address": (customer.address if customer else "") or "",
            "gender": (customer.gender if customer else "") or "",
            "notes": (customer.notes if customer else "") or "",
        }
        photo = request.FILES.get("photo")
        photo_changed = False
        if photo:
            try:
                validate_uploaded_image(photo)
            except ValidationError as exc:
                message = exc.messages[0] if exc.messages else "Upload a JPG, PNG, WEBP, or GIF image."
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
            user.photo.save(photo.name, photo, save=False)
            photo_changed = True
        for field in ("first_name", "last_name", "phone"):
            if field in data:
                setattr(user, field, data[field])
        user.role = User.objects.filter(pk=user.pk).values_list("role", flat=True).first()
        user.is_staff = User.objects.filter(pk=user.pk).values_list("is_staff", flat=True).first()
        user.is_superuser = User.objects.filter(pk=user.pk).values_list("is_superuser", flat=True).first()
        user.save()
        if customer:
            for field in ("address", "gender", "notes"):
                if field in data:
                    setattr(customer, field, data[field])
            if user.photo:
                customer.photo = user.photo.name
            customer.save()
            customer.refresh_from_db()
        user.refresh_from_db()

        changes = []
        labels = {
            "first_name": "First name",
            "last_name": "Last name",
            "phone": "Phone",
            "address": "Address",
            "gender": "Gender",
            "notes": "Notes",
        }
        after = {
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "phone": user.phone or "",
            "address": (customer.address if customer else "") or "",
            "gender": (customer.gender if customer else "") or "",
            "notes": (customer.notes if customer else "") or "",
        }
        gender_labels = dict(Customer.Gender.choices)
        for key, label in labels.items():
            if key not in data:
                continue
            old, new = before[key], after[key]
            if old == new:
                continue
            if key == "gender":
                old = gender_labels.get(old, old) or old
                new = gender_labels.get(new, new) or new
            changes.append((label, old, new))
        if photo_changed:
            changes.append(("Photo", None, "updated"))

        if customer and changes:
            from django_app.models import Notification, notify_customer
            from django_app.telegram_bot import format_change_lines, format_customer_alert

            change_lines = format_change_lines(changes)
            notify_customer(
                customer,
                kind=Notification.Kind.ACCOUNT,
                title="Profile updated",
                message="Updated: " + ", ".join(c[0] for c in changes),
                telegram_text=format_customer_alert(
                    emoji="👤",
                    title="Profile updated",
                    customer=customer,
                    fields=change_lines,
                    body="Your account details were updated.",
                ),
            )
        return Response(profile_payload(user, request))


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)

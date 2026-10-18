import hashlib
import hmac
import logging
import re
import time

from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.db import IntegrityError, transaction
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from django_app.models import AuthProvider, Customer, User

logger = logging.getLogger(__name__)

INVALID_CREDENTIALS = "Invalid credentials."
VERIFY_EMAIL = "Verify your email before signing in."
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
TELEGRAM_MAX_AGE = 60 * 60 * 24
EMAIL_VERIFY_MAX_AGE = 60 * 60 * 24
PASSWORD_RESET_MAX_AGE = 60 * 60


class AuthError(Exception):
    def __init__(self, message, status_code=400, **extra):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.extra = extra


def public_email(user):
    if user.email_is_placeholder:
        return ""
    return user.email


def auth_payload(user, access):
    return {
        "ok": True,
        "access": access,
        "token": access,
        "username": user.username,
        "email": public_email(user),
        "role": user.role,
        "name": user.get_full_name() or user.username,
    }


def issue_tokens(user):
    if user is None or not user.is_active or user.status != User.Status.ACTIVE:
        raise AuthError(INVALID_CREDENTIALS, 400)
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    update_last_login(None, user)
    return auth_payload(user, access), str(refresh)


def notify_telegram_signed_in(user):
    """Push a Telegram alert when a linked customer signs in (not on token refresh)."""
    if user is None or getattr(user, "role", None) != User.Role.CUSTOMER:
        return
    from django_app.models import Customer, Notification, notify_customer

    customer = Customer.objects.filter(user=user).first()
    if customer is None or not (customer.telegram_chat_id or "").strip():
        return
    if customer.telegram_alerts is False:
        return
    from django_app.telegram_bot import format_customer_alert

    notify_customer(
        customer,
        kind=Notification.Kind.ACCOUNT,
        title="Signed in to CarSV",
        message="You signed in to CarSV.",
        in_app=False,
        telegram=True,
        telegram_text=format_customer_alert(
            emoji="🔐",
            title="Signed in",
            customer=customer,
            body="You signed in to CarSV.",
        ),
    )


def password_login(identifier, password):
    user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
    if user is None or not user.check_password(password):
        raise AuthError(INVALID_CREDENTIALS, 400)
    if user.role == User.Role.CUSTOMER and not user.email_verified:
        token = issue_email_verify_token(user)
        _send_signed_email(
            user,
            salt="carsv-email-verify",
            subject="Verify your CarSV account",
            intro="Enter this verification token in the app:",
            token=token,
        )
        raise AuthError(
            VERIFY_EMAIL,
            400,
            code="VERIFY_EMAIL",
            email=public_email(user),
            verification_token=token,
        )
    if user.status != User.Status.ACTIVE or not user.is_active:
        raise AuthError(INVALID_CREDENTIALS, 400)
    tokens = issue_tokens(user)
    notify_telegram_signed_in(user)
    return tokens


def _username_from_email(email):
    local = email.split("@", 1)[0]
    base = re.sub(r"[^\w.@+-]", "", local)[:140] or "customer"
    candidate = base
    number = 1
    while User.objects.filter(username__iexact=candidate).exists():
        number += 1
        candidate = f"{base}{number}"
        if number > 1000:
            raise AuthError("Could not create an account.", 400)
    return candidate


def register_customer(*, email, password, first_name, last_name="", phone=""):
    email = email.strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise AuthError("An account with this email already exists.", 400)
    user = User(
        username=_username_from_email(email),
        email=email,
        first_name=first_name.strip(),
        last_name=(last_name or "").strip(),
        phone=(phone or "").strip(),
        role=User.Role.CUSTOMER,
        status=User.Status.INACTIVE,
        email_verified=False,
        email_is_placeholder=False,
        is_staff=False,
        is_superuser=False,
    )
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise AuthError(" ".join(exc.messages), 400) from exc
    user.set_password(password)
    try:
        user.save()
    except IntegrityError as exc:
        raise AuthError("An account with this email already exists.", 400) from exc
    token = issue_email_verify_token(user)
    _send_signed_email(
        user,
        salt="carsv-email-verify",
        subject="Verify your CarSV account",
        intro="Enter this verification token in the app:",
        token=token,
    )
    return user, token


def issue_email_verify_token(user):
    return TimestampSigner(salt="carsv-email-verify").sign(str(user.pk))


def _send_signed_email(user, *, salt, subject, intro, token=None):
    if user.email_is_placeholder:
        return ""
    if token is None:
        token = TimestampSigner(salt=salt).sign(str(user.pk))
    try:
        send_mail(
            subject,
            f"{intro}\n\n{token}\n",
            "CarSV <noreply@carsv.local>",
            [user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Could not send auth email")
        raise AuthError("The account was saved, but the email could not be sent.", 503) from None
    return token


def _read_signed(token, salt, max_age):
    try:
        return int(TimestampSigner(salt=salt).unsign(token, max_age=max_age))
    except SignatureExpired as exc:
        raise AuthError("This link has expired.", 400) from exc
    except (BadSignature, ValueError, TypeError) as exc:
        raise AuthError("This link is invalid.", 400) from exc


def verify_email(token):
    user = User.objects.filter(pk=_read_signed(token, "carsv-email-verify", EMAIL_VERIFY_MAX_AGE)).first()
    if user is None or user.email_is_placeholder:
        raise AuthError("This link is invalid.", 400)
    user.email_verified = True
    if user.status != User.Status.ACTIVE:
        user.status = User.Status.ACTIVE
    user.save()
    from django_app.models import Customer, Notification, notify_customer

    customer = Customer.objects.filter(user=user).first()
    if customer is not None:
        from django_app.telegram_bot import format_customer_alert

        notify_customer(
            customer,
            kind=Notification.Kind.ACCOUNT,
            title="Welcome to CarSV",
            message=(
                "Your account is verified. Add a vehicle and book a visit anytime. "
                "Connect Telegram in Profile to get garage alerts on your phone."
            ),
            telegram_text=format_customer_alert(
                emoji="👋",
                title="Welcome",
                customer=customer,
                body=[
                    "Welcome to CarSV.",
                    "Add a vehicle and book a visit whenever you’re ready.",
                    "Connect Telegram in Profile to keep getting these alerts.",
                ],
            ),
        )
    return user


def resend_verification(email):
    user = User.objects.filter(email__iexact=(email or "").strip(), email_is_placeholder=False).first()
    if user and not user.email_verified:
        token = issue_email_verify_token(user)
        _send_signed_email(
            user,
            salt="carsv-email-verify",
            subject="Verify your CarSV account",
            intro="Enter this verification token in the app:",
            token=token,
        )
        return token
    return ""


def request_password_reset(email):
    user = User.objects.filter(email__iexact=(email or "").strip(), email_is_placeholder=False).first()
    if user:
        _send_signed_email(
            user,
            salt="carsv-password-reset",
            subject="Reset your CarSV password",
            intro="Enter this reset token in the app:",
        )


def confirm_password_reset(token, password):
    user = User.objects.filter(pk=_read_signed(token, "carsv-password-reset", PASSWORD_RESET_MAX_AGE)).first()
    if user is None or user.email_is_placeholder:
        raise AuthError("This link is invalid.", 400)
    if user.email_verified and user.status != User.Status.ACTIVE:
        raise AuthError("This account is disabled.", 400)
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise AuthError(" ".join(exc.messages), 400) from exc
    user.set_password(password)
    user.email_verified = True
    if user.status != User.Status.ACTIVE:
        user.status = User.Status.ACTIVE
    user.save()
    return user


def change_password(user, current_password, new_password):
    if not user.check_password(current_password or ""):
        raise AuthError("Current password is incorrect.", 400)
    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        raise AuthError(" ".join(exc.messages), 400) from exc
    user.set_password(new_password)
    user.save(update_fields=["password"])


def rotate_refresh(raw_token):
    if not raw_token:
        raise AuthError("Authentication credentials were not provided.", 401)
    try:
        old = RefreshToken(raw_token)
    except TokenError as exc:
        raise AuthError("Refresh token is invalid or expired.", 401) from exc
    user = User.objects.filter(pk=old.get("user_id")).first()
    if user is None or not user.is_active or user.status != User.Status.ACTIVE:
        try:
            old.blacklist()
        except TokenError:
            pass
        raise AuthError("Refresh token is invalid or expired.", 401)
    try:
        old.blacklist()
    except TokenError as exc:
        raise AuthError("Refresh token is invalid or expired.", 401) from exc
    return issue_tokens(user)


def revoke_refresh(raw_token):
    if not raw_token:
        return
    try:
        RefreshToken(raw_token).blacklist()
    except TokenError:
        return


def verify_google_id_token(raw_token):
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise AuthError("Google sign-in is not configured.", 503)
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        logger.exception("Google auth dependencies missing")
        raise AuthError("Google sign-in is unavailable on the server.", 503) from exc

    try:
        info = id_token.verify_oauth2_token(raw_token, google_requests.Request(), client_id)
    except Exception as exc:
        logger.warning("Google token verification failed")
        raise AuthError("Google sign-in could not be verified.", 401) from exc
    if info.get("iss") not in GOOGLE_ISSUERS:
        raise AuthError("Google sign-in could not be verified.", 401)
    if not info.get("email_verified"):
        raise AuthError("Google account email is not verified.", 400)
    subject = str(info.get("sub") or "")
    email = str(info.get("email") or "").strip().lower()
    if not subject or not email:
        raise AuthError("Google sign-in could not be verified.", 401)
    return {
        "sub": subject,
        "email": email,
        "first_name": info.get("given_name") or "",
        "last_name": info.get("family_name") or "",
    }


def verify_telegram_login(payload):
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise AuthError("Telegram sign-in is not configured.", 503)
    data = {}
    for key, value in (payload or {}).items():
        if key == "hash" or value in (None, ""):
            continue
        data[str(key)] = str(value)
    received = str((payload or {}).get("hash") or "")
    if not received or "id" not in data or "auth_date" not in data:
        raise AuthError("Telegram sign-in could not be verified.", 401)
    try:
        auth_date = int(data["auth_date"])
    except (TypeError, ValueError) as exc:
        raise AuthError("Telegram sign-in could not be verified.", 401) from exc
    if abs(int(time.time()) - auth_date) > TELEGRAM_MAX_AGE:
        raise AuthError("Telegram sign-in expired. Try again.", 401)
    check = "\n".join(f"{key}={data[key]}" for key in sorted(data))
    secret = hashlib.sha256(bot_token.encode()).digest()
    digest = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, received):
        raise AuthError("Telegram sign-in could not be verified.", 401)
    return {
        "id": data["id"],
        "first_name": data.get("first_name") or "",
        "last_name": data.get("last_name") or "",
        "username": data.get("username") or "",
    }


def _provider_login(provider, provider_user_id, build_user):
    link = (
        AuthProvider.objects.select_related("user")
        .filter(provider=provider, provider_user_id=provider_user_id)
        .first()
    )
    if link:
        tokens = issue_tokens(link.user)
        notify_telegram_signed_in(link.user)
        return tokens
    try:
        with transaction.atomic():
            user = build_user()
            AuthProvider.objects.create(user=user, provider=provider, provider_user_id=provider_user_id)
    except IntegrityError:
        link = (
            AuthProvider.objects.select_related("user")
            .filter(provider=provider, provider_user_id=provider_user_id)
            .first()
        )
        if link is None:
            raise AuthError("Could not sign in with this account.", 409)
        tokens = issue_tokens(link.user)
        notify_telegram_signed_in(link.user)
        return tokens
    tokens = issue_tokens(user)
    notify_telegram_signed_in(user)
    return tokens


def _activate_google_customer(user, identity):
    """Google already verified the email — activate / refresh profile for login."""
    if user.role != User.Role.CUSTOMER:
        raise AuthError("This Google account is not linked to a customer profile.", 403)
    changed = False
    if user.status != User.Status.ACTIVE:
        user.status = User.Status.ACTIVE
        changed = True
    if not user.email_verified:
        user.email_verified = True
        changed = True
    # Prefer Google's name when the local profile is still empty.
    if identity.get("first_name") and not (user.first_name or "").strip():
        user.first_name = identity["first_name"]
        changed = True
    if identity.get("last_name") and not (user.last_name or "").strip():
        user.last_name = identity["last_name"]
        changed = True
    if changed:
        user.save()
    return user


def google_login(identity):
    # Returning Google user (already linked).
    link = (
        AuthProvider.objects.select_related("user")
        .filter(provider=AuthProvider.Provider.GOOGLE, provider_user_id=identity["sub"])
        .first()
    )
    if link:
        user = _activate_google_customer(link.user, identity)
        tokens = issue_tokens(user)
        notify_telegram_signed_in(user)
        return tokens

    def build():
        existing = User.objects.filter(email__iexact=identity["email"]).first()
        if existing is not None:
            # Same email (e.g. registered but never verified) → activate + link Google.
            return _activate_google_customer(existing, identity)
        user = User(
            username=_username_from_email(identity["email"]),
            email=identity["email"],
            first_name=identity["first_name"],
            last_name=identity["last_name"],
            role=User.Role.CUSTOMER,
            status=User.Status.ACTIVE,
            email_verified=True,
            is_staff=False,
            is_superuser=False,
        )
        user.set_unusable_password()
        user.save()
        return user

    return _provider_login(AuthProvider.Provider.GOOGLE, identity["sub"], build)


def telegram_login(identity):
    def build():
        email = f"telegram.{identity['id']}@users.carsv.invalid"
        if User.objects.filter(email__iexact=email).exists():
            raise AuthError("This Telegram account cannot be linked automatically.", 409)
        username = f"telegram_{identity['id']}"
        if User.objects.filter(username__iexact=username).exists():
            username = f"{username}_{identity['id'][-4:]}"
        user = User(
            username=username,
            email=email,
            first_name=identity["first_name"] or "Telegram",
            last_name=identity["last_name"],
            role=User.Role.CUSTOMER,
            status=User.Status.ACTIVE,
            email_verified=False,
            email_is_placeholder=True,
            is_staff=False,
            is_superuser=False,
        )
        user.set_unusable_password()
        user.save()
        return user

    return _provider_login(AuthProvider.Provider.TELEGRAM, identity["id"], build)


def link_provider(user, provider, provider_user_id):
    taken = AuthProvider.objects.filter(provider=provider, provider_user_id=provider_user_id).exclude(user=user)
    if taken.exists():
        raise AuthError("This sign-in method is already linked to another account.", 400)
    current = AuthProvider.objects.filter(user=user, provider=provider).first()
    if current and current.provider_user_id != provider_user_id:
        raise AuthError("A different account is already linked for this sign-in method.", 400)
    if current:
        return current
    return AuthProvider.objects.create(user=user, provider=provider, provider_user_id=provider_user_id)


def unlink_provider(user, provider):
    link = AuthProvider.objects.filter(user=user, provider=provider).first()
    if link is None:
        raise AuthError("That sign-in method is not linked.", 400)
    has_other = user.auth_providers.exclude(pk=link.pk).exists()
    if not has_other and not user.has_usable_password():
        raise AuthError("Add a password or another sign-in method before unlinking this one.", 400)
    link.delete()
    # Keep alerts in sync: unlinking Telegram sign-in also clears the alert chat.
    if provider == AuthProvider.Provider.TELEGRAM:
        customer = Customer.objects.filter(user=user).first()
        if customer is not None and (customer.telegram_chat_id or "").strip():
            from django_app.telegram_bot import unbind_customer_chat

            unbind_customer_chat(customer)

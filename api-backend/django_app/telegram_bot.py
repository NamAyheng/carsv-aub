"""Telegram Bot API helpers for CarSV customer alerts."""

from __future__ import annotations

import hmac
import json
import logging
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

CONNECT_MAX_AGE = 60 * 60 * 24  # 24 hours
PENDING_MAX_AGE = 60 * 30  # 30 minutes for Yes/No confirm
API_ROOT = "https://api.telegram.org"


def bot_configured():
    return bool((getattr(settings, "TELEGRAM_BOT_TOKEN", None) or "").strip())


def bot_username():
    return (getattr(settings, "TELEGRAM_BOT_USERNAME", None) or "").strip().lstrip("@")


def _token():
    return (getattr(settings, "TELEGRAM_BOT_TOKEN", None) or "").strip()


def connect_deep_link(customer_id):
    """https://t.me/<bot>?start=c<code> — customer taps Start to link alerts."""
    username = bot_username()
    if not username or not bot_configured():
        return ""
    start = _issue_connect_code(customer_id)
    if not start:
        return ""
    return f"https://t.me/{username}?start={urllib.parse.quote(start)}"


def _issue_connect_code(customer_id):
    """
    Store a short one-time code on the customer row (DB), so the Telegram poller
    process can resolve it — locmem cache does not share across processes.
    """
    from django_app.models import Customer

    customer = Customer.objects.filter(pk=customer_id).first()
    if customer is None:
        return ""
    code = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:20]
    customer.telegram_connect_code = code
    customer.telegram_connect_expires = timezone.now() + timedelta(seconds=CONNECT_MAX_AGE)
    customer.save(update_fields=["telegram_connect_code", "telegram_connect_expires"])
    return f"c{code}"


def resolve_start_payload(payload):
    """Return customer id from /start argument, or None."""
    from django_app.models import Customer

    text = (payload or "").strip()
    if not text.startswith("c") or len(text) < 8:
        return None
    code = text[1:]
    customer = (
        Customer.objects.filter(telegram_connect_code=code)
        .exclude(telegram_connect_code="")
        .first()
    )
    if customer is None:
        return None
    if customer.telegram_connect_expires and customer.telegram_connect_expires < timezone.now():
        return None
    # One-time use
    Customer.objects.filter(pk=customer.pk).update(
        telegram_connect_code="",
        telegram_connect_expires=None,
    )
    return customer.pk


def api_call(method, payload=None, timeout=12):
    token = _token()
    if not token:
        return None
    url = f"{API_ROOT}/bot{token}/{method}"
    body = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.warning("Telegram %s failed: %s %s", method, exc.code, detail[:300])
        return None
    except Exception:
        logger.exception("Telegram %s failed", method)
        return None


def send_message(chat_id, text, *, disable_preview=True, reply_markup=None):
    if not chat_id or not (text or "").strip():
        return False
    payload = {
        "chat_id": str(chat_id),
        "text": text.strip()[:4000],
        "disable_web_page_preview": disable_preview,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    result = api_call("sendMessage", payload)
    return bool(result and result.get("ok"))


def answer_callback_query(callback_query_id, text=""):
    payload = {"callback_query_id": str(callback_query_id)}
    if text:
        payload["text"] = text[:200]
    return api_call("answerCallbackQuery", payload)


def share_phone_keyboard():
    return {
        "keyboard": [
            [{"text": "Share my phone number", "request_contact": True}],
        ],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }


def remove_keyboard():
    return {"remove_keyboard": True}


def confirm_link_keyboard():
    return {
        "inline_keyboard": [
            [
                {"text": "✅ Yes, link account", "callback_data": "carsv_link:yes"},
                {"text": "❌ Cancel", "callback_data": "carsv_link:no"},
            ]
        ]
    }


def set_webhook(public_url, secret_token=""):
    """Register Telegram webhook. public_url should be https://host/api/telegram/webhook/"""
    payload = {
        "url": public_url,
        "allowed_updates": ["message", "callback_query"],
    }
    if secret_token:
        payload["secret_token"] = secret_token
    return api_call("setWebhook", payload)


def delete_webhook():
    return api_call("deleteWebhook", {"drop_pending_updates": False})


def verify_webhook_secret(request):
    expected = (getattr(settings, "TELEGRAM_WEBHOOK_SECRET", None) or "").strip()
    if not expected:
        return True
    got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") or ""
    return hmac.compare_digest(got, expected)


def format_telegram_username(username):
    raw = (username or "").strip().lstrip("@")
    return f"@{raw}" if raw else ""


def customer_display_name(customer):
    if customer is None:
        return "there"
    return (getattr(customer, "name", None) or "").strip() or "there"


def customer_email(customer):
    if customer is None:
        return ""
    if getattr(customer, "user", None) is not None:
        email = (customer.user.email or "").strip()
        if email:
            return email
    return (getattr(customer, "email", None) or "").strip()


def customer_phone(customer):
    if customer is None:
        return ""
    phone = (getattr(customer, "phone", None) or "").strip()
    if phone:
        return phone
    user = getattr(customer, "user", None)
    if user is not None:
        return (getattr(user, "phone", None) or "").strip()
    return ""


def format_customer_alert(*, emoji, title, customer=None, name="", fields=None, body=None):
    """Customer-facing Telegram layout (see prompt/telegram-alert-message.md)."""
    who = (name or "").strip() or customer_display_name(customer)
    emoji = (emoji or "").strip()
    title = (title or "").strip() or "Update"
    head = f"{emoji} CarSV · {title}" if emoji else f"CarSV · {title}"
    lines = [head, f"👤 {who}", ""]
    for row in fields or []:
        text = (row or "").strip()
        if text:
            lines.append(text)
    if fields:
        lines.append("")
    paragraphs = body if isinstance(body, (list, tuple)) else ([body] if body else [])
    for para in paragraphs:
        text = (para or "").strip()
        if text:
            lines.append(text)
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def format_alert(title, message, *, telegram_username="", account_name=""):
    """Fallback layout when a call site has not built a full telegram_text yet."""
    del telegram_username  # unused — account name is enough for customers
    title = (title or "").strip()
    message = (message or "").strip()
    account = (account_name or "").strip()
    # Title may already include emoji + "CarSV · …"
    if title.startswith("CarSV") or "CarSV ·" in title[:24]:
        head = title
    elif title:
        head = f"CarSV · {title}"
    else:
        head = "CarSV"
    lines = [head]
    if account:
        lines.append(f"👤 {account}")
        lines.append("")
    if message:
        lines.append(message)
    return "\n".join(lines)


def format_booking_when(booking):
    if booking is None or not getattr(booking, "booking_date", None):
        return ""
    date_s = booking.booking_date.strftime("%d %b %Y")
    if getattr(booking, "booking_time", None):
        return f"{date_s} · {booking.booking_time.strftime('%H:%M')}"
    return date_s


def money_text(amount):
    try:
        value = float(amount)
    except (TypeError, ValueError):
        return f"${amount}"
    return f"${value:,.2f}"


def _display_value(value):
    if value is None:
        return "(empty)"
    text = str(value).strip()
    return text if text else "(empty)"


def format_change_lines(changes):
    """Build ✏️ lines: each item is (label, old, new) or (label, None, 'updated')."""
    lines = []
    for item in changes or []:
        if not item:
            continue
        label, old, new = item[0], item[1], item[2]
        label = (label or "").strip()
        if not label:
            continue
        if old is None and str(new).lower() in {"updated", "changed", "added", "removed"}:
            lines.append(f"✏️ {label}: {new}")
        else:
            lines.append(f"✏️ {label}: {_display_value(old)} → {_display_value(new)}")
    return lines


def booking_extra_service_names(booking):
    if booking is None or not getattr(booking, "pk", None):
        return []
    return list(
        booking.added_services.select_related("service")
        .order_by("id")
        .values_list("service__name", flat=True)
    )


def booking_part_names(booking):
    if booking is None or not getattr(booking, "pk", None):
        return []
    from django_app.models import PartRequest

    return list(
        booking.part_requests.exclude(status=PartRequest.Status.CANCELLED)
        .select_related("spare_part")
        .order_by("id")
        .values_list("spare_part__name", flat=True)
    )


def booking_detail_fields(booking, *, include_when=False, include_status=None):
    """Car + main/extra services + parts (+ optional when/status) for visit alerts."""
    if booking is None:
        return []
    plate = ""
    if getattr(booking, "vehicle_id", None) and getattr(booking, "vehicle", None) is not None:
        plate = (booking.vehicle.plate or "").strip()
    plate = plate or "your car"
    fields = [f"🚗 Car: {plate}"]

    main = ""
    if getattr(booking, "service_id", None) and getattr(booking, "service", None) is not None:
        main = (booking.service.name or "").strip()
    if main:
        fields.append(f"🔧 Main service: {main}")

    extras = [n for n in booking_extra_service_names(booking) if n]
    if extras:
        fields.append(f"🛠️ Extra services: {', '.join(extras)}")

    parts = [n for n in booking_part_names(booking) if n]
    if parts:
        fields.append(f"📦 Parts: {', '.join(parts)}")

    if include_when:
        when = format_booking_when(booking)
        if when:
            fields.append(f"🕒 When: {when}")

    if include_status:
        fields.append(f"📍 Status: {include_status}")

    return fields


def normalize_phone_digits(raw):
    """Normalize to digits, prefer Cambodia international form (855…)."""
    digits = re.sub(r"\D", "", str(raw or ""))
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) >= 8 and digits.startswith("0"):
        digits = "855" + digits[1:]
    return digits


def phone_match_keys(digits):
    digits = (digits or "").strip()
    if not digits:
        return set()
    keys = {digits}
    if digits.startswith("855") and len(digits) > 5:
        local = digits[3:]
        keys.add(local)
        keys.add("0" + local)
    elif digits.startswith("0") and len(digits) > 1:
        keys.add("855" + digits[1:])
        keys.add(digits[1:])
    # Last 8–9 digits help match formatting noise
    if len(digits) >= 8:
        keys.add(digits[-8:])
        keys.add(digits[-9:])
    return {k for k in keys if k}


def find_customers_by_phone(phone_raw):
    """Return active-ish customers whose profile/user phone matches."""
    from django_app.models import Customer

    target = normalize_phone_digits(phone_raw)
    if len(target) < 8:
        return []
    want = phone_match_keys(target)
    matches = []
    qs = Customer.objects.select_related("user").all()
    for customer in qs.iterator():
        candidates = [
            normalize_phone_digits(customer.phone),
            normalize_phone_digits(getattr(customer.user, "phone", "") or ""),
        ]
        for cand in candidates:
            if cand and (phone_match_keys(cand) & want):
                matches.append(customer)
                break
    # Stable unique by pk
    return list({c.pk: c for c in matches}.values())


def customer_identity(customer):
    who = (customer.name or "").strip()
    email = ""
    if getattr(customer, "user", None) is not None:
        email = (customer.user.email or "").strip()
    if not email:
        email = (customer.email or "").strip()
    if who and email:
        return f"{who} ({email})"
    return who or email or f"customer #{customer.pk}"


def chat_id_for_customer(customer):
    """Only the customer's own linked chat — never another account's Telegram."""
    if customer is None:
        return ""
    return (getattr(customer, "telegram_chat_id", None) or "").strip()


def deliver_telegram(customer, title, message, *, telegram_text=None):
    """Send Telegram if THIS customer linked the bot and alerts are on.

    1 CarSV account ↔ 1 Telegram. Switching website login does not redirect
    alerts: the event's customer row always chooses the chat_id.
    Prefer telegram_text (full customer layout); fall back to title + message.
    """
    if customer is None or not bot_configured():
        return False
    if hasattr(customer, "telegram_alerts") and customer.telegram_alerts is False:
        return False
    chat_id = chat_id_for_customer(customer)
    if not chat_id:
        logger.info(
            "Telegram skip customer_id=%s — not linked (no chat_id)",
            getattr(customer, "pk", None),
        )
        return False
    text = (telegram_text or "").strip() or format_alert(
        title,
        message,
        account_name=getattr(customer, "name", "") or "",
    )
    ok = send_message(chat_id, text)
    if not ok:
        logger.warning(
            "Telegram send failed customer_id=%s chat_id=%s",
            getattr(customer, "pk", None),
            chat_id,
        )
    return ok


class TelegramBindError(Exception):
    """Raised when a Telegram chat cannot be linked (already taken or account already linked)."""

    def __init__(self, message, *, owner=None):
        super().__init__(message)
        self.message = message
        self.owner = owner


def customer_for_chat(chat_id):
    from django_app.models import Customer

    chat_id = str(chat_id or "").strip()
    if not chat_id:
        return None
    return (
        Customer.objects.filter(telegram_chat_id=chat_id)
        .select_related("user")
        .first()
    )


def bind_customer_chat(customer, chat_id, *, telegram_username="", also_auth_provider=True):
    """Link one Telegram chat to one CarSV customer (1:1).

    - If this chat is already linked to another customer → refuse (keep the original).
    - If this customer is already linked to a different chat → refuse (Disconnect first).
    - If same customer + same chat → refresh metadata only.
    - If chat is free and customer is unlinked → bind.
    """
    from django_app.models import AuthProvider

    chat_id = str(chat_id or "").strip()
    if customer is None or not chat_id:
        return customer

    username = (telegram_username or "").strip().lstrip("@")
    owner = customer_for_chat(chat_id)

    if owner is not None and owner.pk != customer.pk:
        raise TelegramBindError(
            "\n".join(
                [
                    "🚫 CarSV · Connect blocked",
                    "",
                    "This Telegram is already linked to:",
                    f"👤 {customer_display_name(owner)}",
                    "",
                    "That link stays active.",
                    "To connect another CarSV account, use a different Telegram",
                    "(or ask them to Disconnect in Profile first).",
                ]
            ),
            owner=owner,
        )

    existing = (customer.telegram_chat_id or "").strip()
    if existing and existing != chat_id:
        raise TelegramBindError(
            "\n".join(
                [
                    "🚫 CarSV · Connect blocked",
                    "",
                    f"👤 {customer_display_name(customer)} is already linked to another Telegram.",
                    "Disconnect in CarSV Profile first, then connect with the correct Telegram.",
                ]
            ),
            owner=customer,
        )

    if also_auth_provider and customer.user_id:
        taken = AuthProvider.objects.filter(
            provider=AuthProvider.Provider.TELEGRAM,
            provider_user_id=chat_id,
        ).exclude(user_id=customer.user_id)
        if taken.exists():
            raise TelegramBindError(
                "\n".join(
                    [
                        "🚫 CarSV · Connect blocked",
                        "",
                        "This Telegram sign-in is already linked to another CarSV account.",
                    ]
                ),
                owner=None,
            )

    # Same customer + same chat, or first-time bind on a free chat.
    customer.telegram_chat_id = chat_id
    customer.telegram_username = username or (customer.telegram_username or "")
    customer.telegram_linked_at = timezone.now()
    customer.save(update_fields=["telegram_chat_id", "telegram_username", "telegram_linked_at"])

    if also_auth_provider and customer.user_id:
        AuthProvider.objects.update_or_create(
            user_id=customer.user_id,
            provider=AuthProvider.Provider.TELEGRAM,
            defaults={"provider_user_id": chat_id},
        )
    return customer


def _send_bind_blocked(chat_id, message):
    send_message(chat_id, message, reply_markup=remove_keyboard())


def unbind_customer_chat(customer):
    if customer is None:
        return customer
    from django_app.models import AuthProvider

    chat_id = (customer.telegram_chat_id or "").strip()
    customer.telegram_chat_id = ""
    customer.telegram_username = ""
    customer.telegram_linked_at = None
    customer.save(update_fields=["telegram_chat_id", "telegram_username", "telegram_linked_at"])
    if customer.user_id:
        qs = AuthProvider.objects.filter(
            user_id=customer.user_id,
            provider=AuthProvider.Provider.TELEGRAM,
        )
        if chat_id:
            qs = qs.filter(provider_user_id=chat_id)
        qs.delete()
    return customer


def _clear_pending(chat_id):
    from django_app.models import TelegramLinkPending

    TelegramLinkPending.objects.filter(chat_id=str(chat_id)).delete()


def _store_pending(chat_id, customer, *, telegram_username="", phone_digits=""):
    from django_app.models import TelegramLinkPending

    chat_id = str(chat_id)
    TelegramLinkPending.objects.update_or_create(
        chat_id=chat_id,
        defaults={
            "customer": customer,
            "telegram_username": (telegram_username or "").strip().lstrip("@"),
            "phone_digits": phone_digits or "",
            "expires_at": timezone.now() + timedelta(seconds=PENDING_MAX_AGE),
        },
    )


def _get_pending(chat_id):
    from django_app.models import TelegramLinkPending

    pending = (
        TelegramLinkPending.objects.select_related("customer", "customer__user")
        .filter(chat_id=str(chat_id))
        .first()
    )
    if pending is None:
        return None
    if pending.expires_at < timezone.now():
        pending.delete()
        return None
    return pending


def _send_linked_confirmation(chat_id, customer, tg_username=""):
    del tg_username  # account identity is enough for customers
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
    send_message(chat_id, "\n".join(lines), reply_markup=remove_keyboard())


def _ask_share_phone(chat_id):
    from django_app.models import Customer

    linked = (
        Customer.objects.filter(telegram_chat_id=str(chat_id))
        .select_related("user")
        .first()
    )
    lines = [
        "🔗 CarSV · Connect",
        "",
        "Each CarSV account links to one personal Telegram.",
        "Share the phone number saved on that profile, then confirm.",
    ]
    if linked is not None:
        lines.extend(
            [
                "",
                "This Telegram is already linked to:",
                f"👤 {customer_display_name(linked)}",
                "To link a different account, use that person’s phone, then /start.",
            ]
        )
    lines.extend(
        [
            "",
            "Or: website → Profile → Connect Telegram while signed in.",
        ]
    )
    send_message(chat_id, "\n".join(lines), reply_markup=share_phone_keyboard())


def _handle_start(chat_id, payload, tg_username):
    from django_app.models import Customer

    customer_id = resolve_start_payload(payload) if payload else None
    if customer_id:
        customer = Customer.objects.filter(pk=customer_id).select_related("user").first()
        if customer is not None:
            try:
                bind_customer_chat(customer, chat_id, telegram_username=tg_username)
            except TelegramBindError as exc:
                _clear_pending(chat_id)
                logger.info(
                    "Telegram deep-link blocked customer_id=%s chat_id=%s: %s",
                    customer.pk,
                    chat_id,
                    exc.message.split("\n", 1)[0],
                )
                _send_bind_blocked(chat_id, exc.message)
                return {"ok": True, "handled": True, "linked": None, "blocked": True}
            _clear_pending(chat_id)
            logger.info(
                "Telegram deep-link linked customer_id=%s chat_id=%s username=%s",
                customer.pk,
                chat_id,
                tg_username or "-",
            )
            _send_linked_confirmation(chat_id, customer, tg_username)
            return {"ok": True, "handled": True, "linked": customer_id}
    _ask_share_phone(chat_id)
    return {"ok": True, "handled": True, "linked": None}


def _handle_contact(message, chat_id, from_user, tg_username):
    from django_app.models import Customer

    contact = message.get("contact") or {}
    contact_user_id = contact.get("user_id")
    from_id = from_user.get("id")
    phone = contact.get("phone_number") or ""

    # Only accept the user's own shared contact (not someone else's card).
    if contact_user_id is not None and from_id is not None and int(contact_user_id) != int(from_id):
        send_message(
            chat_id,
            "Please share your own phone number (use the Share my phone number button).",
            reply_markup=share_phone_keyboard(),
        )
        return {"ok": True, "handled": True}

    digits = normalize_phone_digits(phone)
    if len(digits) < 8:
        send_message(
            chat_id,
            "That phone number looks incomplete. Try again, or use Profile → Connect Telegram on the website.",
            reply_markup=share_phone_keyboard(),
        )
        return {"ok": True, "handled": True}

    matches = find_customers_by_phone(phone)
    if not matches:
        send_message(
            chat_id,
            "No CarSV customer uses this phone number yet.\n"
            f"Shared: +{digits}\n\n"
            "Update your phone on the CarSV website profile, then share again — "
            "or sign in and use Profile → Connect Telegram.",
            reply_markup=share_phone_keyboard(),
        )
        return {"ok": True, "handled": True}

    if len(matches) > 1:
        names = ", ".join(customer_identity(c) for c in matches[:5])
        send_message(
            chat_id,
            "Several CarSV accounts use this phone number:\n"
            f"{names}\n\n"
            "Sign in to the correct account on the website and use Profile → Connect Telegram.",
            reply_markup=remove_keyboard(),
        )
        return {"ok": True, "handled": True}

    customer = matches[0]
    chat_id_s = str(chat_id)
    existing_here = customer_for_chat(chat_id_s)

    # Already linked to this same Telegram — nothing to do.
    if existing_here is not None and existing_here.pk == customer.pk:
        lines = [
            "✅ CarSV · Already linked",
            "",
            "This Telegram already receives alerts for:",
            f"👤 {customer_display_name(customer)}",
            "",
            "Other CarSV accounts need their own Telegram.",
        ]
        send_message(chat_id, "\n".join(lines), reply_markup=remove_keyboard())
        return {"ok": True, "handled": True, "linked": customer.pk}

    # Telegram already belongs to someone else — keep owner, block new account.
    if existing_here is not None and existing_here.pk != customer.pk:
        _clear_pending(chat_id)
        _send_bind_blocked(
            chat_id,
            "\n".join(
                [
                    "🚫 CarSV · Connect blocked",
                    "",
                    "This Telegram is already linked to:",
                    f"👤 {customer_display_name(existing_here)}",
                    "",
                    "That link stays active.",
                    f"To connect {customer_display_name(customer)}, use a different Telegram",
                    "(or ask them to Disconnect in Profile first).",
                ]
            ),
        )
        return {"ok": True, "handled": True, "blocked": True}

    # CarSV account already linked to another Telegram — Disconnect first.
    if (customer.telegram_chat_id or "").strip():
        _clear_pending(chat_id)
        _send_bind_blocked(
            chat_id,
            "\n".join(
                [
                    "🚫 CarSV · Connect blocked",
                    "",
                    f"👤 {customer_display_name(customer)} is already linked to another Telegram.",
                    "Disconnect in CarSV Profile first, then connect again.",
                ]
            ),
        )
        return {"ok": True, "handled": True, "blocked": True}

    _store_pending(chat_id, customer, telegram_username=tg_username, phone_digits=digits)
    confirm_lines = [
        "🔗 CarSV · Confirm link",
        "",
        "Link this Telegram chat to:",
        "",
        f"👤 {customer_display_name(customer)}",
    ]
    email = customer_email(customer)
    if email:
        confirm_lines.append(f"📧 {email}")
    phone_show = customer_phone(customer) or f"+{digits}"
    if phone_show:
        confirm_lines.append(f"📱 {phone_show}")
    confirm_lines.extend(
        [
            "",
            "Is this your account?",
        ]
    )
    send_message(chat_id, "\n".join(confirm_lines), reply_markup=confirm_link_keyboard())
    return {"ok": True, "handled": True, "pending": customer.pk}


def _handle_callback(callback):
    data = (callback.get("data") or "").strip()
    cq_id = callback.get("id")
    message = callback.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    from_user = callback.get("from") or {}
    tg_username = (from_user.get("username") or "").strip()

    if not chat_id or not data.startswith("carsv_link:"):
        answer_callback_query(cq_id)
        return {"ok": True, "handled": False}

    action = data.split(":", 1)[-1]
    pending = _get_pending(chat_id)
    if pending is None:
        answer_callback_query(cq_id, "This confirmation expired. Send /start again.")
        send_message(
            chat_id,
            "Confirmation expired. Send /start and share your phone again.",
            reply_markup=share_phone_keyboard(),
        )
        return {"ok": True, "handled": True}

    if action == "no":
        _clear_pending(chat_id)
        answer_callback_query(cq_id, "Cancelled")
        send_message(
            chat_id,
            "Link cancelled. Share a different phone, or use Profile → Connect Telegram on the website.",
            reply_markup=share_phone_keyboard(),
        )
        return {"ok": True, "handled": True, "linked": None}

    if action == "yes":
        customer = pending.customer
        username = pending.telegram_username or tg_username
        try:
            bind_customer_chat(customer, chat_id, telegram_username=username)
        except TelegramBindError as exc:
            _clear_pending(chat_id)
            answer_callback_query(cq_id, "Blocked")
            _send_bind_blocked(chat_id, exc.message)
            return {"ok": True, "handled": True, "blocked": True}
        _clear_pending(chat_id)
        answer_callback_query(cq_id, "Linked")
        logger.info(
            "Telegram phone-confirm linked customer_id=%s chat_id=%s username=%s phone=%s",
            customer.pk,
            chat_id,
            username or "-",
            pending.phone_digits or "-",
        )
        _send_linked_confirmation(chat_id, customer, username)
        return {"ok": True, "handled": True, "linked": customer.pk}

    answer_callback_query(cq_id)
    return {"ok": True, "handled": False}


def handle_update(update):
    """
    Process one Telegram update (webhook or getUpdates).

    Paths:
    - /start cCODE → deep link from CarSV Profile (instant link)
    - /start → ask to share phone
    - contact share → match phone → Yes/No confirm
    - callback Yes/No → bind or cancel
    """
    callback = (update or {}).get("callback_query")
    if callback:
        return _handle_callback(callback)

    message = (update or {}).get("message") or {}
    if not message:
        return {"ok": True, "handled": False}

    chat = message.get("chat") or {}
    from_user = message.get("from") or {}
    chat_id = chat.get("id")
    tg_username = (from_user.get("username") or chat.get("username") or "").strip()
    if not chat_id:
        return {"ok": True, "handled": False}

    if message.get("contact"):
        return _handle_contact(message, chat_id, from_user, tg_username)

    text = (message.get("text") or "").strip()
    if not text:
        return {"ok": True, "handled": False}

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        payload = parts[1].strip() if len(parts) > 1 else ""
        return _handle_start(chat_id, payload, tg_username)

    if text.lower() in {"/link", "link", "/phone", "share"}:
        _ask_share_phone(chat_id)
        return {"ok": True, "handled": True}

    return {"ok": True, "handled": False}

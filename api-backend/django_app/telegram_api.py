"""HTTP endpoints for Telegram bot connect + webhook."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from django_app.models import Customer
from django_app.permissions import IsActiveAccount
from django_app.telegram_bot import (
    bot_configured,
    bot_username,
    connect_deep_link,
    handle_update,
    unbind_customer_chat,
    verify_webhook_secret,
)


class TelegramUserThrottle(UserRateThrottle):
    scope = "auth_user"


class TelegramConnectView(APIView):
    """Authenticated customer: get deep link to Start the bot and link chat id."""

    permission_classes = [IsActiveAccount]
    throttle_classes = [TelegramUserThrottle]

    def get(self, request):
        if not bot_configured() or not bot_username():
            return Response(
                {"ok": False, "error": "Telegram bot is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        customer = Customer.objects.filter(user=request.user).first()
        if customer is None:
            return Response(
                {"ok": False, "error": "No customer profile on this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        url = connect_deep_link(customer.pk)
        if not url:
            return Response(
                {"ok": False, "error": "Could not build the Telegram link."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                "ok": True,
                "url": url,
                "bot_username": bot_username(),
                "linked": bool(customer.telegram_chat_id),
                "telegram_username": (customer.telegram_username or "").strip(),
                "customer_name": (customer.name or "").strip(),
                "telegram_alerts": customer.telegram_alerts,
            }
        )

    def delete(self, request):
        customer = Customer.objects.filter(user=request.user).first()
        if customer is None:
            return Response({"ok": False, "error": "No customer profile."}, status=status.HTTP_400_BAD_REQUEST)
        unbind_customer_chat(customer)
        return Response({"ok": True, "linked": False})

    def patch(self, request):
        """Toggle telegram_alerts on/off without unlinking."""
        customer = Customer.objects.filter(user=request.user).first()
        if customer is None:
            return Response({"ok": False, "error": "No customer profile."}, status=status.HTTP_400_BAD_REQUEST)
        if "telegram_alerts" in request.data:
            customer.telegram_alerts = bool(request.data.get("telegram_alerts"))
            customer.save(update_fields=["telegram_alerts"])
        return Response(
            {
                "ok": True,
                "linked": bool(customer.telegram_chat_id),
                "telegram_alerts": customer.telegram_alerts,
            }
        )


class TelegramWebhookView(APIView):
    """Telegram sends bot updates here (setWebhook).

    No DRF anon throttle — Telegram retries on failure, and a missing
    DEFAULT_THROTTLE_RATES['anon'] entry was returning HTTP 500 (silent bot).
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def post(self, request):
        if not bot_configured():
            return Response({"ok": True})
        if not verify_webhook_secret(request):
            return Response({"ok": False}, status=status.HTTP_403_FORBIDDEN)
        try:
            handle_update(request.data if isinstance(request.data, dict) else {})
        except Exception:
            # Always ACK Telegram so the bot does not go silent on a bad update.
            import logging

            logging.getLogger(__name__).exception("Telegram webhook handler failed")
        return Response({"ok": True})

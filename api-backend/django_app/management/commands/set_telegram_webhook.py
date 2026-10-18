from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from django_app.telegram_bot import bot_configured, delete_webhook, set_webhook


class Command(BaseCommand):
    help = "Register or clear the Telegram bot webhook (needs a public HTTPS URL)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--url",
            default="",
            help="Full webhook URL, e.g. https://api.example.com/api/telegram/webhook/",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove the webhook (use long polling / getUpdates instead).",
        )

    def handle(self, *args, **options):
        if not bot_configured():
            raise CommandError("Set TELEGRAM_BOT_TOKEN in the environment first.")
        if options["clear"]:
            result = delete_webhook()
            self.stdout.write(self.style.SUCCESS(f"Webhook cleared: {result}"))
            return
        url = (options["url"] or "").strip()
        if not url:
            raise CommandError("Pass --url https://your-host/api/telegram/webhook/")
        if not url.startswith("https://"):
            raise CommandError("Telegram requires an HTTPS webhook URL.")
        secret = (getattr(settings, "TELEGRAM_WEBHOOK_SECRET", None) or "").strip()
        result = set_webhook(url, secret_token=secret)
        if not result or not result.get("ok"):
            raise CommandError(f"setWebhook failed: {result}")
        self.stdout.write(self.style.SUCCESS(f"Webhook set to {url}"))

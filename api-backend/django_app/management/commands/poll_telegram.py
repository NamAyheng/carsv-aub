import time

from django.core.management.base import BaseCommand, CommandError

from django_app.telegram_bot import api_call, bot_configured, handle_update


class Command(BaseCommand):
    help = "Long-poll Telegram getUpdates (local/dev when you cannot set a public webhook)."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process one batch and exit.")
        parser.add_argument("--sleep", type=float, default=1.0, help="Pause between empty polls.")

    def handle(self, *args, **options):
        if not bot_configured():
            raise CommandError("Set TELEGRAM_BOT_TOKEN first.")
        # Drop webhook so getUpdates works.
        api_call("deleteWebhook", {"drop_pending_updates": False})
        offset = None
        self.stdout.write(self.style.NOTICE("Polling Telegram… Ctrl+C to stop."))
        while True:
            payload = {"timeout": 25}
            if offset is not None:
                payload["offset"] = offset
            result = api_call("getUpdates", payload, timeout=35)
            updates = (result or {}).get("result") or []
            for update in updates:
                handle_update(update)
                update_id = update.get("update_id")
                if update_id is not None:
                    offset = int(update_id) + 1
            if options["once"]:
                self.stdout.write(self.style.SUCCESS(f"Processed {len(updates)} update(s)."))
                return
            if not updates:
                time.sleep(max(options["sleep"], 0.2))

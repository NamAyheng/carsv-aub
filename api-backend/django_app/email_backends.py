"""Email backends for CarSV.

ResendAPIBackend uses HTTPS (api.resend.com) so it works on Render Free Web
Services, which block outbound SMTP on ports 465/587.
"""

from __future__ import annotations

import json
import logging
from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class ResendAPIBackend(BaseEmailBackend):
    """Send mail through Resend's HTTP API (not SMTP)."""

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        api_key = (getattr(settings, "RESEND_API_KEY", None) or "").strip()
        if not api_key:
            if not self.fail_silently:
                raise RuntimeError("RESEND_API_KEY is not configured.")
            return 0

        sent = 0
        for message in email_messages:
            try:
                self._send_one(api_key, message)
                sent += 1
            except Exception:
                logger.exception("Resend API send failed")
                if not self.fail_silently:
                    raise
        return sent

    def _send_one(self, api_key, message):
        from_email = message.from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "") or ""
        # Lowercase recipients so Resend's test-mode allowlist matches (Gmail is
        # case-insensitive, but Resend compares the address literally).
        to = [(addr or "").strip().lower() for addr in list(message.to or []) if (addr or "").strip()]
        if not to:
            return
        payload = {
            "from": from_email,
            "to": to,
            "subject": message.subject or "",
        }
        # Prefer plain text; include HTML alternative when present.
        body = message.body or ""
        html = None
        if hasattr(message, "alternatives"):
            for content, mimetype in message.alternatives:
                if mimetype == "text/html":
                    html = content
                    break
        if html:
            payload["html"] = html
            if body:
                payload["text"] = body
        else:
            payload["text"] = body

        if message.cc:
            payload["cc"] = list(message.cc)
        if message.bcc:
            payload["bcc"] = list(message.bcc)
        if message.reply_to:
            # Resend accepts a single reply_to string or list.
            payload["reply_to"] = list(message.reply_to)

        # Validate From looks like an address (helps catch misconfig early).
        _, addr = parseaddr(from_email)
        if not addr or "@" not in addr:
            raise ValueError("DEFAULT_FROM_EMAIL / From address is invalid for Resend.")

        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload),
            timeout=30,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Resend API error {response.status_code}: {response.text[:300]}")

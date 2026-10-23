import hashlib
import hmac
import time
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings
from rest_framework.test import APITestCase

from django_app.models import (
    AuthProvider,
    BlogPost,
    Booking,
    BookingService,
    Customer,
    Inspection,
    check_in_booking,
    sync_booking_from_job,
    Estimate,
    Invoice,
    Notification,
    PartRequest,
    confirm_part_request,
    PartsUsage,
    Payment,
    RepairJob,
    Service,
    ServiceCategory,
    SparePart,
    SparePartCategory,
    Staff,
    User as AppUser,
    Vehicle,
)

User = get_user_model()


def _telegram_payload(bot_token, **fields):
    data = {key: str(value) for key, value in fields.items()}
    check = "\n".join(f"{key}={data[key]}" for key in sorted(data))
    secret = hashlib.sha256(bot_token.encode()).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return data


class TelegramPhoneMatchTests(TestCase):
    def test_normalize_and_match_cambodia_numbers(self):
        from django_app.telegram_bot import find_customers_by_phone, normalize_phone_digits, phone_match_keys

        self.assertEqual(normalize_phone_digits("+855 88 583 1366"), "855885831366")
        self.assertEqual(normalize_phone_digits("0885831366"), "855885831366")
        self.assertTrue(phone_match_keys("855885831366") & phone_match_keys("0885831366"))
        hour = find_customers_by_phone("+855885831366")
        # Seed DB may or may not include Hour; matching itself must not crash.
        self.assertIsInstance(hour, list)

    def test_format_customer_alert_layout(self):
        from django_app.telegram_bot import format_customer_alert

        text = format_customer_alert(
            emoji="📅",
            title="Booking received",
            name="Hour",
            fields=[
                "🚗 Car: 2JJ-3431",
                "🔧 Service: Battery replacement",
                "🕒 When: 31 Oct 2026 · 08:45",
            ],
            body=[
                "We got your booking. It’s waiting for the garage to confirm.",
                "We’ll message you when it’s set.",
            ],
        )
        self.assertIn("📅 CarSV · Booking received", text)
        self.assertIn("👤 Hour", text)
        self.assertIn("🚗 Car: 2JJ-3431", text)
        self.assertIn("We got your booking", text)

    def test_format_change_lines_and_booking_detail_fields(self):
        from django_app.telegram_bot import booking_detail_fields, format_change_lines

        lines = format_change_lines(
            [
                ("Phone", "+855111", "+855222"),
                ("Photo", None, "updated"),
            ]
        )
        self.assertEqual(lines[0], "✏️ Phone: +855111 → +855222")
        self.assertEqual(lines[1], "✏️ Photo: updated")

        user = User.objects.create_user(
            username="tg_visit",
            email="tg.visit@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            first_name="Visit",
        )
        customer = user.customer
        vehicle = Vehicle.objects.create(
            customer=customer,
            plate="TST-001",
            brand="Honda",
            model="Civic",
            year=2020,
        )
        category = ServiceCategory.objects.create(name="Test cat", status="ACTIVE")
        main = Service.objects.create(category=category, name="Oil change", price="20.00", status="ACTIVE")
        extra = Service.objects.create(category=category, name="Battery check", price="10.00", status="ACTIVE")
        booking = Booking.objects.create(
            customer=customer,
            vehicle=vehicle,
            service=main,
            booking_date=date.today(),
            status=Booking.Status.PENDING,
        )
        BookingService.objects.create(booking=booking, service=extra, price=extra.price)
        part = SparePart.objects.create(
            part_number="P-TG-1",
            name="Oil filter",
            category=SparePartCategory.objects.create(name="Filters TG", status="ACTIVE"),
            quantity=5,
            unit_price="5.00",
            status="ACTIVE",
        )
        PartRequest.objects.create(
            customer=customer,
            vehicle=vehicle,
            booking=booking,
            spare_part=part,
            fulfillment=PartRequest.Fulfillment.INSTALL,
            status=PartRequest.Status.PENDING,
        )
        fields = booking_detail_fields(booking, include_when=True)
        joined = "\n".join(fields)
        self.assertIn("🔧 Main service: Oil change", joined)
        self.assertIn("🛠️ Extra services: Battery check", joined)
        self.assertIn("📦 Parts: Oil filter", joined)

    def test_bind_refuses_to_steal_existing_telegram_chat(self):
        from django_app.telegram_bot import TelegramBindError, bind_customer_chat

        owner_user = User.objects.create_user(
            username="tg_owner",
            email="tg.owner@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
        )
        owner = owner_user.customer
        owner.name = "Owner"
        owner.phone = "+855111111111"
        owner.telegram_chat_id = "999001"
        owner.save(update_fields=["name", "phone", "telegram_chat_id"])

        other_user = User.objects.create_user(
            username="tg_other",
            email="tg.other@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
        )
        other = other_user.customer
        other.name = "Other"
        other.phone = "+855222222222"
        other.save(update_fields=["name", "phone"])

        with self.assertRaises(TelegramBindError):
            bind_customer_chat(other, "999001", telegram_username="other")
        owner.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(owner.telegram_chat_id, "999001")
        self.assertEqual(other.telegram_chat_id, "")

    def test_bind_allows_free_telegram_and_blocks_second_chat_for_same_customer(self):
        from django_app.telegram_bot import TelegramBindError, bind_customer_chat

        user = User.objects.create_user(
            username="tg_free",
            email="tg.free@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
        )
        customer = user.customer
        customer.name = "Free"
        customer.phone = "+855333333333"
        customer.save(update_fields=["name", "phone"])

        bind_customer_chat(customer, "888001", telegram_username="freeuser")
        customer.refresh_from_db()
        self.assertEqual(customer.telegram_chat_id, "888001")
        with self.assertRaises(TelegramBindError):
            bind_customer_chat(customer, "888002", telegram_username="freeuser")
        customer.refresh_from_db()
        self.assertEqual(customer.telegram_chat_id, "888001")

    def test_deleted_user_frees_telegram_for_same_email_reregister(self):
        """Delete login → orphan Customer frees chat → new account same email can bind."""
        from django_app.telegram_bot import bind_customer_chat, customer_for_chat

        old = User.objects.create_user(
            username="tg_old_email",
            email="reuse.telegram@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            phone="0978767679",
        )
        old_customer = old.customer
        old_customer.email = "reuse.telegram@example.com"
        old_customer.phone = "0978767679"
        old_customer.save(update_fields=["email", "phone"])
        bind_customer_chat(old_customer, "777001", telegram_username="reuse")
        old_customer.refresh_from_db()
        self.assertEqual(old_customer.telegram_chat_id, "777001")

        old_pk = old_customer.pk
        old.delete()
        # Customer row may remain (SET_NULL) but telegram must be cleared by signal.
        from django_app.models import Customer

        leftover = Customer.objects.filter(pk=old_pk).first()
        if leftover is not None:
            self.assertEqual((leftover.telegram_chat_id or "").strip(), "")
            self.assertIsNone(leftover.user_id)

        self.assertIsNone(customer_for_chat("777001"))

        new = User.objects.create_user(
            username="tg_new_email",
            email="reuse.telegram@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            phone="0978767679",
        )
        new_customer = new.customer
        new_customer.email = "reuse.telegram@example.com"
        new_customer.phone = "0978767679"
        new_customer.save(update_fields=["email", "phone"])
        bind_customer_chat(new_customer, "777001", telegram_username="reuse")
        new_customer.refresh_from_db()
        self.assertEqual(new_customer.telegram_chat_id, "777001")

    def test_orphan_customer_telegram_can_be_reclaimed_by_same_email(self):
        """If signal missed, bind still releases orphan chat for the new account."""
        from django_app.models import Customer
        from django_app.telegram_bot import bind_customer_chat

        orphan = Customer.objects.create(
            user=None,
            name="Orphan",
            email="orphan.tg@example.com",
            phone="0987654321",
            telegram_chat_id="666001",
        )
        new = User.objects.create_user(
            username="tg_reclaim",
            email="orphan.tg@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            phone="0987654321",
        )
        claim = new.customer
        claim.email = "orphan.tg@example.com"
        claim.phone = "0987654321"
        claim.save(update_fields=["email", "phone"])

        bind_customer_chat(claim, "666001", telegram_username="reclaim")
        claim.refresh_from_db()
        orphan.refresh_from_db()
        self.assertEqual(claim.telegram_chat_id, "666001")
        self.assertEqual((orphan.telegram_chat_id or "").strip(), "")

    @override_settings(TELEGRAM_BOT_TOKEN="123:test-token")
    @patch("django_app.telegram_bot.send_message", return_value=True)
    def test_alerts_go_to_each_customers_own_telegram(self, send_message):
        from django_app.telegram_bot import deliver_telegram

        user_a = User.objects.create_user(
            username="tg_a",
            email="tg.a@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            first_name="AccountA",
        )
        a = user_a.customer
        a.telegram_chat_id = "111"
        a.save(update_fields=["telegram_chat_id"])
        a.refresh_from_db()

        user_b = User.objects.create_user(
            username="tg_b",
            email="tg.b@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            first_name="AccountB",
        )
        b = user_b.customer
        b.telegram_chat_id = "222"
        b.save(update_fields=["telegram_chat_id"])
        b.refresh_from_db()

        deliver_telegram(a, "Booking", "A booked")
        deliver_telegram(b, "Payment", "B paid")

        self.assertEqual(send_message.call_count, 2)
        self.assertEqual(send_message.call_args_list[0].args[0], "111")
        self.assertIn(f"👤 {a.name}", send_message.call_args_list[0].args[1])
        self.assertEqual(send_message.call_args_list[1].args[0], "222")
        self.assertIn(f"👤 {b.name}", send_message.call_args_list[1].args[1])


class ApiAuthTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="administrator",
            email="admin@carsv.com",
            password="Admin123!@#",
            role=AppUser.Role.ADMIN,
            status=AppUser.Status.ACTIVE,
            is_staff=True,
            is_superuser=True,
            email_verified=True,
        )
        self.customer = User.objects.create_user(
            username="Ayheng",
            email="namayheng12345@gmail.com",
            password="Ayheng123!@#",
            role=AppUser.Role.CUSTOMER,
            status=AppUser.Status.ACTIVE,
            email_verified=True,
        )

    def _login(self, **payload):
        return self.client.post("/api/auth/login/", payload, format="json")

    def test_login_admin_username_returns_jwt(self):
        response = self._login(username="administrator", password="Admin123!@#")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["access"])
        self.assertEqual(response.data["token"], response.data["access"])
        self.assertNotIn("refresh", response.data)
        self.assertEqual(response.data["role"], "ADMIN")
        self.assertIn("carsv_refresh", response.cookies)

    def test_login_customer_email_returns_jwt(self):
        response = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "CUSTOMER")

    def test_legacy_login_path_still_works(self):
        response = self.client.post(
            "/api/login/",
            {"username": "administrator", "password": "Admin123!@#"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["access"])

    def test_login_hides_whether_account_exists(self):
        missing = self._login(email="nobody@example.com", password="wrong")
        bad_password = self._login(username="administrator", password="nope")
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(bad_password.status_code, 400)
        self.assertEqual(missing.data["error"], bad_password.data["error"])

    def test_unverified_customer_cannot_login(self):
        self.customer.email_verified = False
        self.customer.status = AppUser.Status.INACTIVE
        self.customer.save()
        response = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Verify your email before signing in.")

    def test_api_root_requires_bearer_token(self):
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 401)

    def test_admin_bearer_has_full_access(self):
        token = self._login(username="administrator", password="Admin123!@#").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 200)

    def test_customer_bearer_cannot_use_admin_api(self):
        token = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 403)

    def test_invalid_bearer_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-token")
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 401)

    def test_refresh_rotates_and_logout_revokes(self):
        login = self._login(username="administrator", password="Admin123!@#")
        old = login.cookies["carsv_refresh"].value
        refreshed = self.client.post("/api/auth/token/refresh/")
        self.assertEqual(refreshed.status_code, 200)
        self.assertNotEqual(refreshed.cookies["carsv_refresh"].value, old)
        self.assertNotIn("refresh", refreshed.data)
        self.client.cookies["carsv_refresh"] = old
        stale = self.client.post("/api/auth/token/refresh/")
        self.assertEqual(stale.status_code, 401)

        fresh = self._login(username="administrator", password="Admin123!@#")
        current = fresh.cookies["carsv_refresh"].value
        self.client.post("/api/auth/logout/")
        self.client.cookies["carsv_refresh"] = current
        revoked = self.client.post("/api/auth/token/refresh/")
        self.assertEqual(revoked.status_code, 401)

    def test_user_email_must_be_unique(self):
        with self.assertRaises(Exception):
            User.objects.create_user(username="copy", email="admin@carsv.com", password="Other123!@#")

    def test_register_rejects_duplicate_and_does_not_create_staff(self):
        payload = {
            "email": "new.customer@example.com",
            "password": "Testpass123!",
            "first_name": "New",
            "last_name": "Customer",
            "phone": "012",
            "role": "ADMIN",
            "is_staff": True,
        }
        created = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertTrue(created.data.get("email_sent"))
        self.assertNotIn("password", created.data)
        user = User.objects.get(email="new.customer@example.com")
        self.assertEqual(user.role, AppUser.Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.email_verified)
        duplicate = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(duplicate.status_code, 400)
        invalid = self.client.post(
            "/api/auth/register/",
            {"email": "not-an-email", "password": "x", "first_name": "A"},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

    @patch("django_app.auth_services.send_mail", side_effect=RuntimeError("provider refused"))
    def test_register_keeps_account_when_verification_email_fails(self, _send_mail):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "other.person@example.com",
                "password": "Testpass123!",
                "first_name": "Other",
                "phone": "0885831366",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data.get("ok"))
        self.assertFalse(response.data.get("email_sent"))
        user = User.objects.get(email="other.person@example.com")
        self.assertFalse(user.email_verified)
        self.assertEqual(user.status, AppUser.Status.INACTIVE)

    def _token_from_mail(self, body, path="token="):
        from urllib.parse import unquote

        for line in (body or "").splitlines():
            if path in line:
                return unquote(line.split("token=", 1)[-1].strip())
        self.fail(f"No {path} link found in email body")

    def test_verify_email_then_login(self):
        registered = self.client.post(
            "/api/auth/register/",
            {"email": "verify.me@example.com", "password": "Testpass123!", "first_name": "Verify"},
            format="json",
        )
        self.assertEqual(registered.status_code, 201)
        self.assertNotIn("verification_token", registered.data)
        self.assertIn("check your email", registered.data["detail"].lower())
        self.assertEqual(len(mail.outbox), 1)
        token = self._token_from_mail(mail.outbox[-1].body)
        blocked = self._login(email="verify.me@example.com", password="Testpass123!")
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(blocked.data.get("code"), "VERIFY_EMAIL")
        self.assertNotIn("verification_token", blocked.data)
        verified = self.client.post("/api/auth/verify-email/", {"token": token}, format="json")
        self.assertEqual(verified.status_code, 200)
        reused = self.client.post("/api/auth/verify-email/", {"token": token}, format="json")
        self.assertEqual(reused.status_code, 400)
        login = self._login(email="verify.me@example.com", password="Testpass123!")
        self.assertEqual(login.status_code, 200)

    def test_resend_verification_rate_limit_and_no_token_leak(self):
        self.client.post(
            "/api/auth/register/",
            {"email": "resend.me@example.com", "password": "Testpass123!", "first_name": "Resend"},
            format="json",
        )
        mail.outbox.clear()
        first = self.client.post("/api/auth/resend-verification/", {"email": "resend.me@example.com"}, format="json")
        self.assertEqual(first.status_code, 200)
        self.assertNotIn("verification_token", first.data)
        self.assertEqual(len(mail.outbox), 1)
        second = self.client.post("/api/auth/resend-verification/", {"email": "resend.me@example.com"}, format="json")
        self.assertEqual(second.status_code, 429)
        self.assertNotIn("verification_token", second.data)

    def test_expired_verification_link_is_rejected(self):
        import time
        from unittest import mock

        from django_app.auth_services import EMAIL_VERIFY_MAX_AGE

        registered = self.client.post(
            "/api/auth/register/",
            {"email": "expire.me@example.com", "password": "Testpass123!", "first_name": "Expire"},
            format="json",
        )
        self.assertEqual(registered.status_code, 201)
        token = self._token_from_mail(mail.outbox[-1].body)
        future = time.time() + EMAIL_VERIFY_MAX_AGE + 60
        with mock.patch("django.core.signing.time.time", return_value=future):
            response = self.client.post("/api/auth/verify-email/", {"token": token}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.data["error"].lower())

    def test_password_reset_confirm(self):
        self.client.post("/api/auth/password-reset/", {"email": "namayheng12345@gmail.com"}, format="json")
        token = self._token_from_mail(mail.outbox[-1].body, path="token=")
        updated = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"token": token, "password": "Resetpass123!"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        old = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#")
        new = self._login(email="namayheng12345@gmail.com", password="Resetpass123!")
        self.assertEqual(old.status_code, 400)
        self.assertEqual(new.status_code, 200)

    def test_password_change_checks_current_password(self):
        token = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        wrong = self.client.post(
            "/api/auth/password/change/",
            {"current_password": "nope", "password": "Changed123!"},
            format="json",
        )
        self.assertEqual(wrong.status_code, 400)
        changed = self.client.post(
            "/api/auth/password/change/",
            {"current_password": "Ayheng123!@#", "password": "Changed123!"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        self.assertNotIn("password", changed.data)
        self.client.credentials()
        old = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#")
        new = self._login(email="namayheng12345@gmail.com", password="Changed123!")
        self.assertEqual(old.status_code, 400)
        self.assertEqual(new.status_code, 200)

    def test_public_media_is_readable_and_private_needs_signature(self):
        from pathlib import Path

        from django.conf import settings
        from django.test import override_settings

        from django_app.media_serving import media_url_path

        public_name = "services/test-oil.jpg"
        private_name = "payments/2026/10/proof.jpg"
        public_path = Path(settings.MEDIA_ROOT) / public_name
        private_path = Path(settings.MEDIA_ROOT) / private_name
        public_path.parent.mkdir(parents=True, exist_ok=True)
        private_path.parent.mkdir(parents=True, exist_ok=True)
        public_path.write_bytes(b"public-bytes")
        private_path.write_bytes(b"secret-bytes")

        open_public = self.client.get(f"/media/{public_name}")
        self.assertEqual(open_public.status_code, 200)

        with override_settings(DEBUG=False):
            blocked = self.client.get(f"/media/{private_name}")
            self.assertEqual(blocked.status_code, 403)
            signed = media_url_path(private_name, force_sign=True)
            allowed = self.client.get(signed)
            self.assertEqual(allowed.status_code, 200)
            self.assertEqual(allowed.getvalue(), b"secret-bytes")

    def test_seed_catalog_demo_is_idempotent_and_skips_users(self):
        import shutil
        import tempfile
        from pathlib import Path

        from django.core.management import call_command
        from django.test import override_settings

        catalog = Path(__file__).resolve().parents[1] / "catalog_media"
        self.assertTrue((catalog / "services" / "service-oil-change.jpg").is_file())

        with tempfile.TemporaryDirectory() as tmp:
            media_root = Path(tmp)
            for prefix in ("services", "parts", "blog", "products"):
                src = catalog / prefix
                if src.is_dir():
                    shutil.copytree(src, media_root / prefix)
            users_before = User.objects.count()
            with override_settings(MEDIA_ROOT=str(media_root)):
                call_command("seed_catalog_demo")
                first_services = Service.objects.count()
                first_parts = SparePart.objects.count()
                self.assertGreaterEqual(first_services, 1)
                self.assertGreaterEqual(first_parts, 1)
                call_command("seed_catalog_demo")
                self.assertEqual(Service.objects.count(), first_services)
                self.assertEqual(SparePart.objects.count(), first_parts)
            self.assertEqual(User.objects.count(), users_before)
            self.assertFalse(Vehicle.objects.filter(notes__startswith="sample-garage").exists())

    def test_resend_api_backend_posts_over_https(self):
        from unittest import mock

        from django.core.mail import EmailMessage
        from django.test import override_settings

        from django_app.email_backends import ResendAPIBackend

        class FakeResponse:
            status_code = 200
            text = '{"id":"ok"}'

        with override_settings(RESEND_API_KEY="re_test", DEFAULT_FROM_EMAIL="CarSV <onboarding@resend.dev>"):
            with mock.patch("django_app.email_backends.requests.post", return_value=FakeResponse()) as post:
                backend = ResendAPIBackend()
                sent = backend.send_messages(
                    [EmailMessage("Subject", "Body text", None, ["a@example.com"])]
                )
        self.assertEqual(sent, 1)
        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertIn("Bearer re_test", kwargs["headers"]["Authorization"])

    def test_me_hides_role_changes(self):
        token = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.patch("/api/auth/me/", {"first_name": "Ayheng", "role": "ADMIN", "is_staff": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "CUSTOMER")
        self.assertEqual(response.data["first_name"], "Ayheng")
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_staff)
        self.assertEqual(self.customer.role, AppUser.Role.CUSTOMER)

    @patch("django_app.auth_api.verify_google_id_token")
    def test_google_login_links_existing_customer_email(self, verify):
        verify.return_value = {
            "sub": "google-sub-1",
            "email": "namayheng12345@gmail.com",
            "first_name": "Ayheng",
            "last_name": "Nam",
        }
        existing = User.objects.get(email="namayheng12345@gmail.com")
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuthProvider.objects.filter(
                provider=AuthProvider.Provider.GOOGLE,
                provider_user_id="google-sub-1",
                user=existing,
            ).exists()
        )
        self.assertEqual(response.data["username"], existing.username)

    @patch("django_app.auth_api.verify_google_id_token")
    def test_google_login_activates_inactive_registered_email(self, verify):
        pending = User.objects.create_user(
            username="pending_google",
            email="pending.google@example.com",
            password="TempPass123!@#",
            role=AppUser.Role.CUSTOMER,
            status=AppUser.Status.INACTIVE,
            email_verified=False,
        )
        verify.return_value = {
            "sub": "google-sub-pending",
            "email": "pending.google@example.com",
            "first_name": "Pending",
            "last_name": "User",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            response = self.client.post("/api/auth/google/", {"credential": "fake"}, format="json")
        self.assertEqual(response.status_code, 200)
        pending.refresh_from_db()
        self.assertEqual(pending.status, AppUser.Status.ACTIVE)
        self.assertTrue(pending.email_verified)
        self.assertTrue(
            AuthProvider.objects.filter(
                provider=AuthProvider.Provider.GOOGLE,
                provider_user_id="google-sub-pending",
                user=pending,
            ).exists()
        )

    @patch("django_app.auth_api.verify_google_id_token")
    def test_google_login_creates_customer_and_can_link(self, verify):
        verify.return_value = {
            "sub": "google-sub-2",
            "email": "google.user@example.com",
            "first_name": "Google",
            "last_name": "User",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            created = self.client.post("/api/auth/google/", {"credential": "fake"}, format="json")
            again = self.client.post("/api/auth/google/", {"credential": "fake"}, format="json")
        self.assertEqual(created.status_code, 200)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(created.data["username"], again.data["username"])
        user = User.objects.get(email="google.user@example.com")
        self.assertEqual(user.role, AppUser.Role.CUSTOMER)
        self.assertFalse(user.has_usable_password())
        token = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        verify.return_value = {
            "sub": "google-sub-3",
            "email": "namayheng12345@gmail.com",
            "first_name": "Ayheng",
            "last_name": "",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            linked = self.client.post("/api/auth/link/google/", {"id_token": "fake"}, format="json")
        self.assertEqual(linked.status_code, 200)
        blocked = self.client.post("/api/auth/unlink/", {"provider": "google"}, format="json")
        self.assertEqual(blocked.status_code, 200)
        last = self.client.post("/api/auth/unlink/", {"provider": "google"}, format="json")
        self.assertEqual(last.status_code, 400)

    @patch("django_app.auth_api.verify_google_id_token")
    def test_google_only_account_password_login_and_reset(self, verify):
        verify.return_value = {
            "sub": "google-sub-oauth-only",
            "email": "oauth.only@example.com",
            "first_name": "OAuth",
            "last_name": "Only",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            created = self.client.post("/api/auth/google/", {"credential": "fake"}, format="json")
        self.assertEqual(created.status_code, 200)
        user = User.objects.get(email="oauth.only@example.com")
        self.assertFalse(user.has_usable_password())

        blocked = self._login(email="oauth.only@example.com", password="Anything123!")
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(blocked.data.get("code"), "NO_LOCAL_PASSWORD")
        self.assertNotIn("password", blocked.data)

        mail.outbox.clear()
        reset = self.client.post("/api/auth/password-reset/", {"email": "OAuth.Only@example.com"}, format="json")
        self.assertEqual(reset.status_code, 200)
        token = self._token_from_mail(mail.outbox[-1].body, path="token=")
        confirmed = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"token": token, "password": "LocalPass123!"},
            format="json",
        )
        self.assertEqual(confirmed.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.has_usable_password())
        login = self._login(email="oauth.only@example.com", password="LocalPass123!")
        self.assertEqual(login.status_code, 200)

    @patch("django_app.auth_api.verify_google_id_token")
    def test_oauth_user_can_set_first_password_without_current(self, verify):
        verify.return_value = {
            "sub": "google-sub-set-pw",
            "email": "set.password@example.com",
            "first_name": "Set",
            "last_name": "Password",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            created = self.client.post("/api/auth/google/", {"credential": "fake"}, format="json")
        self.assertEqual(created.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {created.data['access']}")
        set_pw = self.client.post(
            "/api/auth/password/change/",
            {"current_password": "", "password": "FirstPass123!"},
            format="json",
        )
        self.assertEqual(set_pw.status_code, 200)
        self.client.credentials()
        login = self._login(email="set.password@example.com", password="FirstPass123!")
        self.assertEqual(login.status_code, 200)

    @patch("django_app.auth_api.verify_google_id_token")
    def test_link_google_rejects_email_mismatch(self, verify):
        token = self._login(email="namayheng12345@gmail.com", password="Ayheng123!@#").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        verify.return_value = {
            "sub": "google-sub-mismatch",
            "email": "someone.else@example.com",
            "first_name": "Other",
            "last_name": "",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            response = self.client.post("/api/auth/link/google/", {"id_token": "fake"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("match", response.data["error"].lower())

    def test_google_id_token_requires_verified_email(self):
        from unittest import mock

        from django_app.auth_services import AuthError, verify_google_id_token

        with override_settings(GOOGLE_CLIENT_ID="test-client"):
            with mock.patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value={
                    "iss": "https://accounts.google.com",
                    "sub": "sub-unverified",
                    "email": "unverified@example.com",
                    "email_verified": False,
                },
            ):
                with self.assertRaises(AuthError) as ctx:
                    verify_google_id_token("fake-token")
        self.assertIn("not verified", str(ctx.exception.message).lower())

    def test_google_unconfigured(self):
        with override_settings(GOOGLE_CLIENT_ID=""):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"}, format="json")
        self.assertEqual(response.status_code, 503)

    def test_telegram_login_verifies_signature(self):
        bot = "123:telegram-test"
        payload = _telegram_payload(
            bot,
            id=4242,
            first_name="Tele",
            auth_date=int(time.time()),
            email="should-not-merge@example.com",
        )
        with override_settings(TELEGRAM_BOT_TOKEN=bot):
            bad = self.client.post("/api/auth/telegram/", {**payload, "hash": "nope"}, format="json")
            ok = self.client.post("/api/auth/telegram/", payload, format="json")
            again = self.client.post("/api/auth/telegram/", payload, format="json")
        self.assertEqual(bad.status_code, 401)
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(again.status_code, 200)
        user = User.objects.get(username="telegram_4242")
        self.assertTrue(user.email_is_placeholder)
        self.assertNotEqual(user.email, "should-not-merge@example.com")
        self.assertEqual(ok.data["email"], "")

    def test_cors_allows_frontend_origin(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "administrator", "password": "wrong"},
            format="json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:3000")
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")


class CustomerApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="Testpass123!",
            role=AppUser.Role.CUSTOMER,
            status=AppUser.Status.ACTIVE,
            email_verified=True,
        )
        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="Testpass123!",
            role=AppUser.Role.CUSTOMER,
            status=AppUser.Status.ACTIVE,
            email_verified=True,
        )
        category = ServiceCategory.objects.create(name="Brakes", status="ACTIVE")
        self.service = Service.objects.create(category=category, name="Pad replacement", price="40.00", status="ACTIVE")
        self.own_vehicle = Vehicle.objects.create(
            customer=self.owner.customer,
            plate="OWN-1",
            brand="Honda",
            model="Civic",
            year=2020,
        )
        self.other_vehicle = Vehicle.objects.create(
            customer=self.other.customer,
            plate="OTH-1",
            brand="Toyota",
            model="Vios",
            year=2019,
        )
        token = self.client.post(
            "/api/auth/login/",
            {"email": "owner@example.com", "password": "Testpass123!"},
            format="json",
        ).data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_unauthenticated_customer_api_is_blocked(self):
        self.client.credentials()
        response = self.client.get("/api/customer/vehicles/")
        self.assertEqual(response.status_code, 401)

    def test_customer_sees_only_own_vehicle_and_cannot_open_another(self):
        listing = self.client.get("/api/customer/vehicles/")
        self.assertEqual(listing.status_code, 200)
        plates = [row["plate"] for row in listing.data]
        self.assertEqual(plates, ["OWN-1"])
        hidden = self.client.get(f"/api/customer/vehicles/{self.other_vehicle.id}/")
        self.assertEqual(hidden.status_code, 404)

    def test_customer_vehicle_image_is_saved_and_scoped_to_the_owner(self):
        import io
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        png = io.BytesIO()
        Image.new("RGB", (8, 8), "blue").save(png, format="PNG")
        photo = SimpleUploadedFile("civic.png", png.getvalue(), content_type="image/png")
        replacement = io.BytesIO()
        Image.new("RGB", (8, 8), "green").save(replacement, format="PNG")
        next_photo = SimpleUploadedFile("civic-2.png", replacement.getvalue(), content_type="image/png")
        fake = SimpleUploadedFile("notes.txt", b"not an image", content_type="text/plain")
        with override_settings(MEDIA_ROOT=tempfile.mkdtemp()):
            created = self.client.post(
                "/api/customer/vehicles/",
                {
                    "plate": "2BD-1001",
                    "brand": "Honda",
                    "model": "Civic",
                    "year": 2021,
                    "image": photo,
                },
                format="multipart",
            )
            self.assertEqual(created.status_code, 201, created.data)
            self.assertIn("/media/vehicles/", created.data["image_url"])
            self.assertEqual(created.data["status"], Vehicle.Status.ACTIVE)
            vehicle_id = created.data["id"]
            replaced = self.client.patch(
                f"/api/customer/vehicles/{vehicle_id}/",
                {"image": next_photo, "status": "INACTIVE"},
                format="multipart",
            )
            self.assertEqual(replaced.status_code, 200, replaced.data)
            self.assertIn("/media/vehicles/", replaced.data["image_url"])
            self.assertNotEqual(replaced.data["image_url"], created.data["image_url"])
            self.assertEqual(replaced.data["status"], Vehicle.Status.ACTIVE)
            denied = self.client.patch(
                f"/api/customer/vehicles/{self.other_vehicle.id}/",
                {"image": next_photo},
                format="multipart",
            )
            self.assertEqual(denied.status_code, 404)
            rejected = self.client.patch(
                f"/api/customer/vehicles/{vehicle_id}/",
                {"image": fake},
                format="multipart",
            )
            self.assertEqual(rejected.status_code, 400)
            plain = self.client.post(
                "/api/customer/vehicles/",
                {"plate": "2a-1002", "brand": "Toyota", "model": "Vios", "year": 2018},
                format="json",
            )
            self.assertEqual(plain.status_code, 201, plain.data)
            self.assertEqual(plain.data["image_url"], "")
            self.assertEqual(plain.data["plate"], "2A-1002")
            named = self.client.post(
                "/api/customer/vehicles/",
                {"plate": "2CD-1003", "brand": "photo.jpg", "model": "Civic", "year": 2020},
                format="json",
            )
            self.assertEqual(named.status_code, 400)

    def test_customer_plate_must_be_two_then_letters_then_four_digits(self):
        rejected = self.client.post(
            "/api/customer/vehicles/",
            {"plate": "PP-4101", "brand": "Toyota", "model": "Vios", "year": 2020},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)
        too_long = self.client.post(
            "/api/customer/vehicles/",
            {"plate": "2ABC-1234", "brand": "Toyota", "model": "Vios", "year": 2020},
            format="json",
        )
        self.assertEqual(too_long.status_code, 400)
        one_letter = self.client.post(
            "/api/customer/vehicles/",
            {"plate": "2a-4321", "brand": "Honda", "model": "Civic", "year": 2021},
            format="json",
        )
        self.assertEqual(one_letter.status_code, 201, one_letter.data)
        self.assertEqual(one_letter.data["plate"], "2A-4321")

    def test_customer_can_update_and_delete_only_their_own_vehicle(self):
        from datetime import date

        from django_app.models import Booking

        created = self.client.post(
            "/api/customer/vehicles/",
            {"plate": "2bd-2201", "brand": "Honda", "model": "Civic", "year": 2020, "mileage": 100, "color": "White"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        vehicle_id = created.data["id"]
        self.assertEqual(created.data["plate"], "2BD-2201")

        updated = self.client.patch(
            f"/api/customer/vehicles/{vehicle_id}/",
            {"model": "Accord", "mileage": 1200, "color": "Blue", "vehicle_type": "Sedan", "status": "INACTIVE"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["model"], "Accord")
        self.assertEqual(updated.data["mileage"], 1200)
        self.assertEqual(updated.data["status"], "ACTIVE")

        hidden = self.client.patch(
            f"/api/customer/vehicles/{self.other_vehicle.id}/",
            {"model": "Stolen"},
            format="json",
        )
        self.assertEqual(hidden.status_code, 404)
        self.assertEqual(self.client.delete(f"/api/customer/vehicles/{self.other_vehicle.id}/").status_code, 404)

        Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 10, 11),
        )
        blocked = self.client.delete(f"/api/customer/vehicles/{self.own_vehicle.id}/")
        self.assertEqual(blocked.status_code, 400)
        self.assertIn("service records", blocked.data["detail"])

        removed = self.client.delete(f"/api/customer/vehicles/{vehicle_id}/")
        self.assertEqual(removed.status_code, 204)
        self.assertEqual(self.client.get(f"/api/customer/vehicles/{vehicle_id}/").status_code, 404)

    def test_booking_rejects_another_customers_vehicle_and_staff_fields(self):
        denied = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.other_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-11-01",
                "booking_time": "09:00",
                "status": "COMPLETED",
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 400)
        created = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.own_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-11-01",
                "booking_time": "09:00",
                "status": "COMPLETED",
                "problem": "Noise",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["status"], Booking.Status.PENDING)
        clash = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.own_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-11-01",
                "booking_time": "09:00",
            },
            format="json",
        )
        self.assertEqual(clash.status_code, 400)

    def test_customer_cannot_change_repair_status(self):
        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 11, 2),
            status=Booking.Status.IN_SERVICE,
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            problem="Noise",
            status=RepairJob.Status.REPAIRING,
            progress=20,
        )
        listing = self.client.get("/api/customer/repairs/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data[0]["id"], job.id)
        self.assertEqual(listing.data[0]["status"], RepairJob.Status.REPAIRING)
        denied = self.client.patch(f"/api/customer/repairs/{job.id}/", {"status": "COMPLETED", "progress": 100}, format="json")
        self.assertEqual(denied.status_code, 405)
        job.refresh_from_db()
        self.assertEqual(job.status, RepairJob.Status.REPAIRING)

    def test_public_services_are_active_catalog_only(self):
        Service.objects.create(category=self.service.category, name="Hidden", price="10.00", status="INACTIVE")
        self.client.credentials()
        response = self.client.get("/api/public/services/")
        self.assertEqual(response.status_code, 200)
        names = [row["name"] for row in response.data]
        self.assertIn("Pad replacement", names)
        self.assertNotIn("Hidden", names)

    def test_public_blog_lists_published_posts_only(self):
        BlogPost.objects.create(
            title="Oil change guide",
            slug="oil-change-guide",
            category="Maintenance",
            excerpt="What the oil change includes.",
            body="First paragraph.\n\nSecond paragraph.",
            tips="Check the level.\nKeep the invoice.",
            published=True,
            featured=True,
        )
        BlogPost.objects.create(
            title="Draft only",
            slug="draft-only",
            category="Workshop",
            excerpt="Not public.",
            body="Hidden.",
            published=False,
        )
        self.client.credentials()
        response = self.client.get("/api/public/blog/")
        self.assertEqual(response.status_code, 200)
        titles = [row["title"] for row in response.data]
        self.assertIn("Oil change guide", titles)
        self.assertNotIn("Draft only", titles)
        guide = next(row for row in response.data if row["title"] == "Oil change guide")
        self.assertEqual(guide["body"], ["First paragraph.", "Second paragraph."])
        self.assertEqual(guide["tips"], ["Check the level.", "Keep the invoice."])

    def test_booking_creates_a_customer_notification(self):
        created = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.own_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-11-03",
                "booking_time": "10:00",
                "problem": "Squeak",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        notes = self.client.get("/api/customer/notifications/")
        self.assertEqual(notes.status_code, 200)
        self.assertEqual(len(notes.data), 1)
        self.assertIn("OWN-1", notes.data[0]["message"])
        other = self.client.post(
            "/api/auth/login/",
            {"email": "other@example.com", "password": "Testpass123!"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other.data['access']}")
        hidden = self.client.get("/api/customer/notifications/")
        self.assertEqual(hidden.data, [])

    def test_customer_invoice_and_estimate_stay_private(self):
        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 11, 4),
            status=Booking.Status.COMPLETED,
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            status=RepairJob.Status.COMPLETED,
        )
        invoice = Invoice.objects.create(
            number="INV-TEST-1",
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            repair_job=job,
            labor_cost=Decimal("20.00"),
            service_cost=Decimal("10.00"),
            parts_cost=Decimal("5.00"),
            tax=Decimal("3.50"),
        )
        estimate = Estimate.objects.create(
            number="EST-TEST-1",
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            repair_job=job,
            labor_cost=Decimal("15.00"),
        )
        other_booking = Booking.objects.create(
            customer=self.other.customer,
            vehicle=self.other_vehicle,
            service=self.service,
            booking_date=date(2026, 11, 5),
        )
        other_job = RepairJob.objects.create(
            booking=other_booking,
            customer=self.other.customer,
            vehicle=self.other_vehicle,
        )
        Invoice.objects.create(
            number="INV-OTHER-1",
            customer=self.other.customer,
            vehicle=self.other_vehicle,
            repair_job=other_job,
        )
        invoices = self.client.get("/api/customer/invoices/")
        self.assertEqual([row["number"] for row in invoices.data], ["INV-TEST-1"])
        self.assertEqual(invoices.data[0]["grand_total"], "38.50")
        hidden = self.client.get(f"/api/customer/invoices/{invoice.id}/")
        self.assertEqual(hidden.status_code, 200)
        estimates = self.client.get("/api/customer/estimates/")
        self.assertEqual(estimates.data[0]["number"], "EST-TEST-1")
        approved = self.client.post(f"/api/customer/estimates/{estimate.id}/approve/", {"note": "Go ahead"}, format="json")
        self.assertEqual(approved.status_code, 200)
        estimate.refresh_from_db()
        self.assertEqual(estimate.status, Estimate.Status.APPROVED)
        again = self.client.post(f"/api/customer/estimates/{estimate.id}/reject/", {}, format="json")
        self.assertEqual(again.status_code, 400)

    def test_parts_catalog_lists_active_stock_only(self):
        category = SparePartCategory.objects.create(name="Filters")
        SparePart.objects.create(
            part_number="OF-1",
            name="Oil filter",
            category=category,
            unit_price="12.00",
            quantity=4,
            status=SparePart.Status.ACTIVE,
        )
        SparePart.objects.create(
            part_number="OF-2",
            name="Old filter",
            category=category,
            status=SparePart.Status.INACTIVE,
        )
        response = self.client.get("/api/customer/parts/")
        self.assertEqual(response.status_code, 200)
        names = [row["name"] for row in response.data]
        self.assertEqual(names, ["Oil filter"])
        self.assertEqual(response.data[0]["quantity"], 4)

    def test_part_request_is_saved_for_the_customer_and_does_not_change_stock(self):
        category = SparePartCategory.objects.create(name="Request filters")
        part = SparePart.objects.create(
            part_number="OF-REQ",
            name="Request oil filter",
            category=category,
            unit_price="12.00",
            quantity=4,
            status=SparePart.Status.ACTIVE,
        )
        denied = self.client.post(
            "/api/customer/part-requests/",
            {"spare_part": part.id, "vehicle": self.other_vehicle.id, "fulfillment": "DELIVERY"},
            format="json",
        )
        self.assertEqual(denied.status_code, 400)
        created = self.client.post(
            "/api/customer/part-requests/",
            {
                "spare_part": part.id,
                "vehicle": self.own_vehicle.id,
                "fulfillment": "PICKUP_AT_COUNTER",
                "notes": "Need it Friday",
                "status": "NOTED",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], PartRequest.Status.PENDING)
        self.assertTrue(created.data["number"].startswith("PR-"))
        self.assertEqual(created.data["part_name"], "Request oil filter")
        self.assertEqual(created.data["vehicle_plate"], self.own_vehicle.plate)
        part.refresh_from_db()
        self.assertEqual(part.quantity, 4)
        listing = self.client.get("/api/customer/part-requests/")
        self.assertEqual([row["number"] for row in listing.data], [created.data["number"]])
        other = self.client.post(
            "/api/auth/login/",
            {"email": "other@example.com", "password": "Testpass123!"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other.data['access']}")
        self.assertEqual(self.client.get("/api/customer/part-requests/").data, [])
        self.assertEqual(self.client.get(f"/api/customer/part-requests/{created.data['id']}/").status_code, 404)

    def test_confirming_a_part_request_uses_the_open_job_and_invoice(self):
        from django.core.exceptions import ValidationError

        category = SparePartCategory.objects.create(name="Request compressors")
        part = SparePart.objects.create(
            part_number="AC-REQ",
            name="Request compressor",
            category=category,
            unit_price="20.00",
            quantity=3,
            status=SparePart.Status.ACTIVE,
        )
        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 10, 2),
            status=Booking.Status.IN_SERVICE,
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            status=RepairJob.Status.REPAIRING,
            problem="Existing job",
        )
        invoice = Invoice.objects.create(
            number="INV-REQ-OPEN",
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            repair_job=job,
            labor_cost="10.00",
            service_cost="0",
            parts_cost="5.00",
            status=Invoice.Status.DRAFT,
        )
        created = self.client.post(
            "/api/customer/part-requests/",
            {"spare_part": part.id, "vehicle": self.own_vehicle.id, "fulfillment": "INSTALL_IN_WORKSHOP"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        row = PartRequest.objects.get(pk=created.data["id"])
        confirm_part_request(row)
        confirm_part_request(row)
        part.refresh_from_db()
        invoice.refresh_from_db()
        row.refresh_from_db()
        self.assertEqual(part.quantity, 2)
        self.assertEqual(PartsUsage.objects.filter(repair_job=job, spare_part=part).count(), 1)
        self.assertEqual(row.status, PartRequest.Status.CONFIRMED)
        self.assertEqual(row.repair_job_id, job.id)
        self.assertEqual(invoice.parts_cost, Decimal("25.00"))
        self.assertEqual(invoice.status, Invoice.Status.UNPAID)
        self.assertEqual(invoice.grand_total, Decimal("35.00"))
        self.assertEqual(Payment.objects.filter(invoice=invoice).count(), 0)
        self.assertEqual(RepairJob.objects.filter(vehicle=self.own_vehicle).count(), 1)
        listing = self.client.get("/api/customer/part-requests/")
        saved = listing.data[0]
        self.assertEqual(saved["work_order_number"], f"WO-{job.id:04d}")
        self.assertEqual(saved["invoice_number"], "INV-REQ-OPEN")
        self.assertEqual(saved["invoice_status"], Invoice.Status.UNPAID)
        self.assertEqual(Decimal(saved["amount_paid"]), Decimal("0"))
        invoices = self.client.get("/api/customer/invoices/")
        billed = next(item for item in invoices.data if item["number"] == "INV-REQ-OPEN")
        self.assertEqual([item["part_number"] for item in billed["parts"]], ["AC-REQ"])
        note = Notification.objects.get(customer=self.owner.customer, kind=Notification.Kind.INVOICE)
        self.assertIn("INV-REQ-OPEN", note.message)

        empty = SparePart.objects.create(
            part_number="AC-EMPTY",
            name="Empty compressor",
            category=category,
            unit_price="10.00",
            quantity=0,
            status=SparePart.Status.ACTIVE,
        )
        blocked = PartRequest.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            spare_part=empty,
            fulfillment=PartRequest.Fulfillment.INSTALL,
        )
        with self.assertRaises(ValidationError):
            confirm_part_request(blocked)
        self.assertEqual(SparePart.objects.get(pk=empty.pk).quantity, 0)
        self.assertFalse(PartsUsage.objects.filter(spare_part=empty).exists())

    def test_confirming_a_part_request_opens_a_work_order_when_the_car_has_none(self):
        from django.core.exceptions import ValidationError

        category = SparePartCategory.objects.create(name="Request filters two")
        part = SparePart.objects.create(
            part_number="OF-NEW",
            name="Counter filter",
            category=category,
            unit_price="8.00",
            quantity=2,
            status=SparePart.Status.ACTIVE,
        )
        missing_vehicle = PartRequest.objects.create(
            customer=self.owner.customer,
            spare_part=part,
            fulfillment=PartRequest.Fulfillment.PICKUP,
        )
        with self.assertRaises(ValidationError):
            confirm_part_request(missing_vehicle)
        self.assertEqual(SparePart.objects.get(pk=part.pk).quantity, 2)

        row = PartRequest.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            spare_part=part,
            fulfillment=PartRequest.Fulfillment.PICKUP,
            notes="Hold at the counter",
        )
        confirm_part_request(row)
        row.refresh_from_db()
        part.refresh_from_db()
        self.assertEqual(part.quantity, 1)
        self.assertEqual(row.status, PartRequest.Status.CONFIRMED)
        job = row.repair_job
        self.assertEqual(job.status, RepairJob.Status.READY_FOR_PICKUP)
        self.assertTrue(job.booking.note.startswith("Opened from PR-"))
        invoice = job.invoice
        self.assertEqual(invoice.parts_cost, Decimal("8.00"))
        self.assertEqual(invoice.labor_cost, Decimal("0"))
        self.assertEqual(invoice.service_cost, Decimal("0"))
        self.assertEqual(invoice.status, Invoice.Status.UNPAID)
        self.assertEqual(invoice.number, f"INV-{row.number}")
        self.assertEqual(Payment.objects.filter(invoice=invoice).count(), 0)
        sheet = self.client.get(f"/api/customer/invoices/{invoice.id}/")
        self.assertEqual(sheet.data["service_name"], "Requested part")
        self.assertEqual(sheet.data["parts"][0]["part_number"], "OF-NEW")

    def test_extra_service_and_part_stay_on_the_same_visit_until_check_in(self):
        created = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.own_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-12-01",
                "booking_time": "09:00",
                "problem": "Oil change",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        upgrade = Service.objects.create(
            category=self.service.category,
            name="Engine upgrade",
            price="90.00",
            status="ACTIVE",
        )
        added = self.client.post(
            f"/api/customer/bookings/{created.data['id']}/add-service/",
            {"service": upgrade.id},
            format="json",
        )
        self.assertEqual(added.status_code, 200, added.data)
        self.assertEqual([row["name"] for row in added.data["services"]], ["Pad replacement", "Engine upgrade"])
        self.assertEqual(Booking.objects.filter(vehicle=self.own_vehicle).count(), 1)

        category = SparePartCategory.objects.create(name="Visit filters")
        part = SparePart.objects.create(
            part_number="OF-VISIT",
            name="Visit filter",
            category=category,
            unit_price="6.00",
            quantity=3,
            status=SparePart.Status.ACTIVE,
        )
        requested = self.client.post(
            "/api/customer/part-requests/",
            {"spare_part": part.id, "vehicle": self.own_vehicle.id, "fulfillment": "INSTALL_IN_WORKSHOP"},
            format="json",
        )
        self.assertEqual(requested.status_code, 201, requested.data)
        row = PartRequest.objects.get(pk=requested.data["id"])
        confirm_part_request(row)
        row.refresh_from_db()
        part.refresh_from_db()
        self.assertEqual(row.status, PartRequest.Status.CONFIRMED)
        self.assertEqual(row.booking_id, created.data["id"])
        self.assertIsNone(row.parts_usage_id)
        self.assertIsNone(row.repair_job_id)
        self.assertEqual(part.quantity, 3)
        self.assertEqual(RepairJob.objects.filter(vehicle=self.own_vehicle).count(), 0)

        booking = Booking.objects.get(pk=created.data["id"])
        check_in_booking(booking)
        booking.refresh_from_db()
        row.refresh_from_db()
        part.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.DIAGNOSING)
        job = booking.repair_job
        self.assertEqual(job.status, RepairJob.Status.DIAGNOSING)
        self.assertFalse(job.mechanic_id)
        self.assertTrue(Inspection.objects.filter(repair_job=job).exists())
        self.assertEqual(part.quantity, 2)
        self.assertEqual(row.repair_job_id, job.id)
        invoice = job.invoice
        self.assertEqual(invoice.service_cost, Decimal("130.00"))
        self.assertEqual(invoice.parts_cost, Decimal("6.00"))
        self.assertEqual(invoice.status, Invoice.Status.UNPAID)
        self.assertEqual(Payment.objects.filter(invoice=invoice).count(), 0)
        sheet = self.client.get(f"/api/customer/invoices/{invoice.id}/")
        self.assertEqual(sheet.data["service_name"], "Pad replacement, Engine upgrade")

        job.status = RepairJob.Status.COMPLETED
        sync_booking_from_job(job)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.COMPLETED)
        closed = self.client.post(
            f"/api/customer/bookings/{booking.id}/add-service/",
            {"service": upgrade.id},
            format="json",
        )
        self.assertEqual(closed.status_code, 400)

    def test_work_order_form_copies_the_visit_and_rejects_a_second_job(self):
        from django_app.admin import RepairJobGarageForm

        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date="2026-12-02",
            booking_time="09:30",
            problem="Pads are thin.\nNoise on the left.",
            status=Booking.Status.CONFIRMED,
        )
        form = RepairJobGarageForm(
            data={
                "booking": booking.id,
                "customer": self.other.customer.id,
                "vehicle": self.other_vehicle.id,
                "problem": "Typed over the visit",
                "start_date": "2020-01-01",
                "status": RepairJob.Status.DIAGNOSING,
                "progress": "10",
            }
        )
        self.assertTrue(form.is_valid(), form.errors)
        job = form.save()
        self.assertEqual(job.customer_id, self.owner.customer.id)
        self.assertEqual(job.vehicle_id, self.own_vehicle.id)
        self.assertEqual(job.problem, "Pads are thin.\nNoise on the left.")
        self.assertEqual(str(job.start_date), "2026-12-02")
        self.assertEqual(job.progress, 20)
        self.assertEqual(job.inspection.status, Inspection.Status.CHECK_IN)

        again = RepairJobGarageForm(
            data={"booking": booking.id, "status": RepairJob.Status.WAITING, "progress": "0"}
        )
        self.assertFalse(again.is_valid())

        cancelled = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date="2026-12-03",
            status=Booking.Status.CANCELLED,
        )
        rejected = RepairJobGarageForm(
            data={"booking": cancelled.id, "status": RepairJob.Status.WAITING, "progress": "0"}
        )
        self.assertFalse(rejected.is_valid())

    def test_next_stage_updates_the_work_order_and_the_booking(self):
        from django_app.models import job_can_reach, next_job_status

        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date="2026-12-22",
            status=Booking.Status.CONFIRMED,
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            status=RepairJob.Status.WAITING,
        )
        self.assertEqual(job.progress, 0)
        self.assertEqual(next_job_status(job.status), RepairJob.Status.DIAGNOSING)
        job.status = next_job_status(job.status)
        job.save(update_fields=["status"])
        job.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(job.status, RepairJob.Status.DIAGNOSING)
        self.assertEqual(job.progress, 20)
        self.assertEqual(booking.status, Booking.Status.DIAGNOSING)
        self.assertIsNone(next_job_status(RepairJob.Status.COMPLETED))
        self.assertFalse(job_can_reach(job, RepairJob.Status.WAITING_APPROVAL))
        job.inspection.status = Inspection.Status.COMPLETED
        job.inspection.save(update_fields=["status"])
        self.assertTrue(job_can_reach(job, RepairJob.Status.WAITING_APPROVAL))
        job.status = RepairJob.Status.WAITING_APPROVAL
        job.save(update_fields=["status"])
        self.assertFalse(job_can_reach(job, RepairJob.Status.REPAIRING))

    def test_quote_confirm_and_cancel_follow_the_same_booking(self):
        from django.core.exceptions import ValidationError

        from django_app.admin import RepairJobGarageForm
        from django_app.models import Invoice, check_in_booking, confirm_part_request

        category = SparePartCategory.objects.create(name="Quote pads")
        part = SparePart.objects.create(
            part_number="QT-PAD",
            name="Quote pad",
            category=category,
            unit_price="8.00",
            quantity=4,
            status=SparePart.Status.ACTIVE,
        )
        declined = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.own_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-12-24",
                "booking_time": "08:30",
                "problem": "Pulls left",
            },
            format="json",
        )
        self.assertEqual(declined.status_code, 201, declined.data)
        booking = Booking.objects.get(pk=declined.data["id"])
        check_in_booking(booking, self.owner)
        job = booking.repair_job
        job.inspection.status = Inspection.Status.COMPLETED
        job.inspection.save(update_fields=["status"])
        job.status = RepairJob.Status.WAITING_APPROVAL
        job.save(update_fields=["status"])
        requested = self.client.post(
            "/api/customer/part-requests/",
            {
                "spare_part": part.id,
                "vehicle": self.own_vehicle.id,
                "booking": booking.id,
                "fulfillment": "INSTALL_IN_WORKSHOP",
            },
            format="json",
        )
        self.assertEqual(requested.status_code, 201, requested.data)
        row = PartRequest.objects.get(pk=requested.data["id"])
        self.assertEqual(row.booking_id, booking.id)
        self.assertEqual(part.quantity, 4)

        skipped = RepairJobGarageForm(
            data={
                "booking": booking.id,
                "customer": booking.customer_id,
                "vehicle": booking.vehicle_id,
                "problem": booking.problem,
                "start_date": "2026-12-24",
                "status": RepairJob.Status.REPAIRING,
                "progress": "60",
            },
            instance=job,
        )
        self.assertFalse(skipped.is_valid())
        self.assertIn("quote page", str(skipped.errors.get("status")))

        cancelled = self.client.post(
            f"/api/customer/repairs/{job.id}/decline/",
            {"reason": "Not this visit"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        booking.refresh_from_db()
        job.refresh_from_db()
        part.refresh_from_db()
        invoice = Invoice.objects.get(repair_job=job)
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertEqual(job.status, RepairJob.Status.CANCELLED)
        self.assertEqual(invoice.status, Invoice.Status.CANCELLED)
        self.assertEqual(part.quantity, 4)
        self.assertTrue(Inspection.objects.filter(repair_job=job).exists())
        with self.assertRaises(ValidationError):
            confirm_part_request(row)

        approved = self.client.post(
            "/api/customer/bookings/",
            {
                "vehicle": self.own_vehicle.id,
                "service": self.service.id,
                "booking_date": "2026-12-28",
                "booking_time": "10:00",
                "problem": "Soft pedal",
            },
            format="json",
        )
        self.assertEqual(approved.status_code, 201, approved.data)
        second = Booking.objects.get(pk=approved.data["id"])
        check_in_booking(second, self.owner)
        second_job = second.repair_job
        second_job.inspection.status = Inspection.Status.COMPLETED
        second_job.inspection.save(update_fields=["status"])
        second_job.status = RepairJob.Status.WAITING_APPROVAL
        second_job.save(update_fields=["status"])
        blocked = self.client.post(f"/api/customer/repairs/{second_job.id}/confirm/", {}, format="json")
        self.assertEqual(blocked.status_code, 200, blocked.data)
        second.refresh_from_db()
        second_job.refresh_from_db()
        self.assertEqual(second_job.status, RepairJob.Status.REPAIRING)
        self.assertEqual(second.status, Booking.Status.REPAIRING)
        self.assertEqual(second_job.progress, 60)

    def test_booking_conflict_check_in_and_completion_stay_linked(self):
        from django_app.models import Invoice, check_in_booking, complete_booking

        payload = {
            "vehicle": self.own_vehicle.id,
            "service": self.service.id,
            "booking_date": "2026-12-20",
            "booking_time": "09:30",
            "problem": "Brake noise",
        }
        first = self.client.post("/api/customer/bookings/", payload, format="json")
        self.assertEqual(first.status_code, 201, first.data)
        clash = self.client.post("/api/customer/bookings/", payload, format="json")
        self.assertEqual(clash.status_code, 400)

        booking = Booking.objects.get(pk=first.data["id"])
        check_in_booking(booking, self.owner)
        booking.refresh_from_db()
        self.own_vehicle.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.DIAGNOSING)
        self.assertEqual(booking.repair_job.status, RepairJob.Status.DIAGNOSING)
        self.assertEqual(self.own_vehicle.status, Vehicle.Status.IN_SHOP)
        invoice = Invoice.objects.get(repair_job=booking.repair_job)
        self.assertEqual(invoice.status, Invoice.Status.UNPAID)
        self.assertEqual(invoice.service_cost, Decimal(self.service.price))

        blocked = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            {"cancel_reason": "Changed my mind"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(booking.repair_job.status, RepairJob.Status.DIAGNOSING)

        complete_booking(Booking.objects.get(pk=booking.pk))
        booking.refresh_from_db()
        booking.repair_job.refresh_from_db()
        self.own_vehicle.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.COMPLETED)
        self.assertEqual(booking.repair_job.status, RepairJob.Status.COMPLETED)
        self.assertEqual(booking.repair_job.progress, 100)
        self.assertEqual(self.own_vehicle.status, Vehicle.Status.ACTIVE)

    def test_confirmed_booking_opens_a_work_order_and_follows_it(self):
        from django_app.admin import BookingGarageForm
        from django_app.models import ensure_confirmed_job

        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date="2026-12-21",
            booking_time="11:00",
            status=Booking.Status.PENDING,
            problem="Squeak",
        )
        self.assertFalse(BookingGarageForm(instance=booking).fields["status"].disabled)

        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=["status"])
        ensure_confirmed_job(booking)
        booking.refresh_from_db()
        self.own_vehicle.refresh_from_db()
        job = booking.repair_job
        self.assertEqual(job.status, RepairJob.Status.WAITING)
        self.assertEqual(booking.status, Booking.Status.WAITING)
        self.assertEqual(str(job.start_date), "2026-12-21")
        self.assertEqual(self.own_vehicle.status, Vehicle.Status.ACTIVE)
        self.assertTrue(BookingGarageForm(instance=booking).fields["status"].disabled)

        job.status = RepairJob.Status.REPAIRING
        job.save(update_fields=["status"])
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.REPAIRING)
        blocked = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            {"cancel_reason": "Too late"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)

        job.status = RepairJob.Status.WAITING
        job.save(update_fields=["status"])
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.WAITING)
        cancelled = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            {"cancel_reason": "Plans changed"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertFalse(RepairJob.objects.filter(pk=job.id).exists())

    def test_parts_usage_reduces_stock_and_payment_updates_the_invoice(self):
        from django.core.exceptions import ValidationError

        category = SparePartCategory.objects.create(name="Plugs")
        part = SparePart.objects.create(
            part_number="SPK-1",
            name="Plug",
            category=category,
            unit_price="10.00",
            quantity=5,
        )
        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 10, 1),
            problem="misfire",
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            problem="misfire",
        )
        usage = PartsUsage(
            repair_job=job,
            spare_part=part,
            quantity=2,
            unit_price=part.unit_price,
            total=0,
        )
        usage.save()
        part.refresh_from_db()
        self.assertEqual(part.quantity, 3)
        self.assertTrue(usage.stock_applied)
        too_many = PartsUsage(
            repair_job=job,
            spare_part=part,
            quantity=9,
            unit_price=part.unit_price,
            total=0,
        )
        with self.assertRaises(ValidationError):
            too_many.save()
        part.refresh_from_db()
        self.assertEqual(part.quantity, 3)
        invoice = Invoice.objects.get(repair_job=job)
        self.assertEqual(invoice.parts_cost, Decimal("20.00"))
        invoice.labor_cost = Decimal("20.00")
        invoice.service_cost = Decimal("0")
        invoice.save()
        invoice.refresh_from_db()
        half = (invoice.grand_total / 2).quantize(Decimal("0.01"))
        Payment.objects.create(
            number="PAY-TEST-1",
            invoice=invoice,
            customer=self.owner.customer,
            amount=half,
            paid_at=date(2026, 10, 2),
            status=Payment.Status.PAID,
        )
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PARTIAL)
        Payment.objects.create(
            number="PAY-TEST-2",
            invoice=invoice,
            customer=self.owner.customer,
            amount=invoice.grand_total - half,
            paid_at=date(2026, 10, 2),
            status=Payment.Status.PAID,
        )
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)

    def test_pending_payment_does_not_pay_invoice_until_verified(self):
        import io
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django_app.models import ensure_visit_invoice, job_advance_block_reason, verify_payment
        from PIL import Image

        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 11, 1),
            problem="brakes",
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            problem="brakes",
            status=RepairJob.Status.QUALITY_CHECK,
        )
        invoice = ensure_visit_invoice(job)
        invoice.labor_cost = Decimal("50.00")
        invoice.save()
        invoice.refresh_from_db()

        blocked = job_advance_block_reason(job, RepairJob.Status.READY_FOR_PICKUP)
        self.assertIn("not paid", blocked.lower())

        buf = io.BytesIO()
        Image.new("RGB", (40, 40), color=(20, 120, 200)).save(buf, format="JPEG")
        proof = SimpleUploadedFile("slip.jpg", buf.getvalue(), content_type="image/jpeg")
        with override_settings(MEDIA_ROOT=tempfile.mkdtemp()):
            claim = self.client.post(
                "/api/customer/payments/",
                {
                    "invoice": invoice.id,
                    "amount": str(invoice.grand_total),
                    "method": "QR",
                    "reference": "ABA-TEST",
                    "proof": proof,
                },
                format="multipart",
            )
            self.assertEqual(claim.status_code, 201, claim.data)
            self.assertEqual(claim.data["status"], Payment.Status.PENDING)
            invoice.refresh_from_db()
            self.assertEqual(invoice.status, Invoice.Status.UNPAID)
            sheet = self.client.get(f"/api/customer/invoices/{invoice.id}/")
            self.assertEqual(sheet.data["payment_state"], "PENDING")
            still = job_advance_block_reason(job, RepairJob.Status.READY_FOR_PICKUP)
            self.assertIn("verification", still.lower())

            payment = Payment.objects.get(pk=claim.data["id"])
            self.assertEqual(payment.vehicle_id, invoice.vehicle_id)
            with self.assertRaises(ValidationError):
                verify_payment(payment, user=self.owner)
            staff_user = User.objects.create_user(
                username="cashier-verify",
                email="cashier-verify@example.com",
                password="pass12345",
                role=AppUser.Role.CASHIER,
                status=AppUser.Status.ACTIVE,
                email_verified=True,
            )
            staff = Staff.objects.get(user=staff_user)
            payment.received_by = staff
            payment.save(update_fields=["received_by"])
            verify_payment(payment, user=self.owner)
            invoice.refresh_from_db()
            self.assertEqual(invoice.status, Invoice.Status.PAID)
            self.assertEqual(job_advance_block_reason(job, RepairJob.Status.READY_FOR_PICKUP), "")

    def test_customer_repay_deletes_pending_payment_on_backend(self):
        import io
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django_app.models import ensure_visit_invoice
        from PIL import Image

        booking = Booking.objects.create(
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            service=self.service,
            booking_date=date(2026, 11, 2),
            problem="oil",
        )
        job = RepairJob.objects.create(
            booking=booking,
            customer=self.owner.customer,
            vehicle=self.own_vehicle,
            problem="oil",
            status=RepairJob.Status.QUALITY_CHECK,
        )
        invoice = ensure_visit_invoice(job)
        invoice.labor_cost = Decimal("40.00")
        invoice.save()
        invoice.refresh_from_db()

        buf = io.BytesIO()
        Image.new("RGB", (32, 32), color=(10, 80, 160)).save(buf, format="JPEG")
        proof = SimpleUploadedFile("bad-slip.jpg", buf.getvalue(), content_type="image/jpeg")
        with override_settings(MEDIA_ROOT=tempfile.mkdtemp()):
            claim = self.client.post(
                "/api/customer/payments/",
                {
                    "invoice": invoice.id,
                    "amount": str(invoice.grand_total),
                    "method": "QR",
                    "proof": proof,
                },
                format="multipart",
            )
            self.assertEqual(claim.status_code, 201, claim.data)
            pay_id = claim.data["id"]
            self.assertTrue(Payment.objects.filter(pk=pay_id, status=Payment.Status.PENDING).exists())

            payment = Payment.objects.get(pk=pay_id)
            proof_name = payment.proof_image.name
            self.assertTrue(proof_name)
            storage = payment.proof_image.storage
            self.assertTrue(storage.exists(proof_name))

            withdrawn = self.client.post(f"/api/customer/payments/{pay_id}/withdraw/", {}, format="json")
            self.assertEqual(withdrawn.status_code, 200, withdrawn.data)
            self.assertTrue(withdrawn.data["ok"])
            self.assertFalse(Payment.objects.filter(pk=pay_id).exists())
            self.assertFalse(storage.exists(proof_name))
            invoice.refresh_from_db()
            self.assertEqual(invoice.status, Invoice.Status.UNPAID)
            sheet = self.client.get(f"/api/customer/invoices/{invoice.id}/")
            self.assertEqual(sheet.data["payment_state"], "UNPAID")

    def test_public_blog_image_is_a_media_url(self):
        BlogPost.objects.create(
            title="Photo article",
            slug="photo-article",
            category="Workshop",
            excerpt="Has a photo.",
            body="Paragraph.",
            published=True,
            image="blog/engine-bay-serpentine-belt.jpg",
        )
        self.client.credentials()
        response = self.client.get("/api/public/blog/")
        row = next(item for item in response.data if item["title"] == "Photo article")
        self.assertIn("/media/blog/engine-bay-serpentine-belt.jpg", row["image"])

    def test_public_service_image_is_a_media_url(self):
        self.service.image = "services/service-oil-change.jpg"
        self.service.save(update_fields=["image"])
        self.client.credentials()
        response = self.client.get("/api/public/services/")
        row = next(item for item in response.data if item["id"] == self.service.id)
        self.assertIn("/media/services/service-oil-change.jpg", row["image_url"])

    def test_vehicle_form_saves_replaces_and_clears_an_image(self):
        import io
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        from django_app.admin import VehicleGarageForm

        fields = {
            "customer": self.owner.customer.pk,
            "brand": "Honda",
            "model": "Civic",
            "year": 2020,
            "plate": "2IM-1004",
            "vin": "IMG1VIN000000001",
            "color": "White",
            "mileage": 1000,
            "vehicle_type": "Sedan",
            "engine_number": "",
            "status": Vehicle.Status.ACTIVE,
            "next_service_date": "",
            "next_service_mileage": "",
            "notes": "",
        }
        jpeg = io.BytesIO()
        Image.new("RGB", (8, 8), "blue").save(jpeg, format="JPEG")
        png = io.BytesIO()
        Image.new("RGB", (8, 8), "green").save(png, format="PNG")
        with override_settings(MEDIA_ROOT=tempfile.mkdtemp()):
            created = VehicleGarageForm(
                data=fields,
                files={"image": SimpleUploadedFile("one.jpg", jpeg.getvalue(), content_type="image/jpeg")},
            )
            self.assertTrue(created.is_valid(), created.errors)
            vehicle = created.save()
            self.assertTrue(vehicle.image.name.startswith("vehicles/"))
            self.assertTrue(vehicle.image.name.endswith(".jpg"))
            replaced = VehicleGarageForm(
                data=fields,
                files={"image": SimpleUploadedFile("two.png", png.getvalue(), content_type="image/png")},
                instance=vehicle,
            )
            self.assertTrue(replaced.is_valid(), replaced.errors)
            vehicle = replaced.save()
            self.assertTrue(vehicle.image.name.endswith(".png"))
            cleared = VehicleGarageForm(data={**fields, "image-clear": "on"}, instance=vehicle)
            self.assertTrue(cleared.is_valid(), cleared.errors)
            vehicle = cleared.save()
            self.assertFalse(vehicle.image)

    def test_blog_form_uses_a_file_input(self):
        from django_app.admin import BlogPostGarageForm

        form = BlogPostGarageForm()
        self.assertEqual(form.fields["image"].widget.input_type, "file")

    def test_blog_form_saves_replaces_and_deletes_an_image(self):
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test.utils import override_settings

        from django_app.admin import BlogPostGarageForm

        import io

        from PIL import Image

        fields = {
            "title": "Upload test",
            "slug": "upload-test",
            "category": "Workshop",
            "excerpt": "A draft used to check the image field.",
            "body": "Paragraph.",
            "tips": "",
            "author_name": "CarSV Workshop",
            "read_minutes": 4,
        }
        jpeg = io.BytesIO()
        Image.new("RGB", (8, 8), "blue").save(jpeg, format="JPEG")
        png = io.BytesIO()
        Image.new("RGB", (8, 8), "red").save(png, format="PNG")
        with override_settings(MEDIA_ROOT=tempfile.mkdtemp()):
            created = BlogPostGarageForm(
                data=fields,
                files={"image": SimpleUploadedFile("one.jpg", jpeg.getvalue(), content_type="image/jpeg")},
            )
            self.assertTrue(created.is_valid(), created.errors)
            post = created.save()
            self.assertTrue(post.image.name.endswith(".jpg"))
            replaced = BlogPostGarageForm(
                data=fields,
                files={"image": SimpleUploadedFile("two.png", png.getvalue(), content_type="image/png")},
                instance=post,
            )
            self.assertTrue(replaced.is_valid(), replaced.errors)
            post = replaced.save()
            self.assertTrue(post.image.name.endswith(".png"))
            post_id = post.id
            post.delete()
        self.assertFalse(BlogPost.objects.filter(pk=post_id).exists())

    def test_profile_photo_upload_rejects_non_images(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        notes = SimpleUploadedFile("notes.txt", b"not an image", content_type="text/plain")
        response = self.client.patch("/api/auth/me/", {"photo": notes}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_profile_photo_upload_returns_a_media_url(self):
        import tempfile

        import io

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test.utils import override_settings
        from PIL import Image

        png = io.BytesIO()
        Image.new("RGB", (8, 8), "red").save(png, format="PNG")
        photo = SimpleUploadedFile("face.png", png.getvalue(), content_type="image/png")
        with override_settings(MEDIA_ROOT=tempfile.mkdtemp()):
            response = self.client.patch(
                "/api/auth/me/",
                {"first_name": "Owner", "photo": photo},
                format="multipart",
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn("/media/", response.data["photo_url"])
        self.assertTrue(response.data["photo_url"].endswith(".png"))


class AdminDashboardSecurityTests(TestCase):
    def test_admin_login_post_requires_csrf(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post("/admin/login/", {"username": "administrator", "password": "Admin123!@#"})
        self.assertEqual(response.status_code, 403)

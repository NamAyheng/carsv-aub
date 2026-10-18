"""
Django settings for django_backend project.
"""

import os
import sys
from datetime import timedelta
from pathlib import Path

from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-gpswhb7*&4g*nu#3x4c9psdv$0gql+z)^1^gfsnuil9_9(mhxk",
)
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]

INSTALLED_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.forms",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "django_app.apps.DjangoAppConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django_backend.middleware.LocalhostCorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "django_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "django_app" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django_app.context_processors.carsv_header",
            ],
        },
    },
]

WSGI_APPLICATION = "django_backend.wsgi.application"
FORM_RENDERER = "django.forms.renderers.TemplatesSetting"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        # runserver + Telegram poller both write; wait instead of failing fast.
        "OPTIONS": {
            "timeout": 60,
        },
    }
}

AUTH_USER_MODEL = "django_app.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
# Django serves this folder while DEBUG is on. In production, serve MEDIA_ROOT at MEDIA_URL.
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME", "")
# Optional: set the same value in BotFather setWebhook secret_token header.
TELEGRAM_WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")

_TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"
REFRESH_COOKIE_NAME = "carsv_refresh"
REFRESH_COOKIE_PATH = "/api/auth/"
REFRESH_COOKIE_SECURE = os.environ.get("DJANGO_COOKIE_SECURE", "0") == "1"

CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "django_app.permissions.IsGarageAdmin",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10000/min" if _TESTING else "10/min",
        "auth_user": "10000/min" if _TESTING else "30/min",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

UNFOLD = {
    "SITE_TITLE": "CarSV ERP",
    "SITE_HEADER": "CarSV",
    "SITE_SUBHEADER": "Precision garage",
    "SITE_SYMBOL": "directions_car",
    "SITE_URL": "/",
    "DASHBOARD_CALLBACK": "django_app.dashboard.dashboard_callback",
    "BORDER_RADIUS": "0.75rem",
    "COLORS": {
        "primary": {
            "50": "#eff6ff",
            "100": "#dbeafe",
            "200": "#bfdbfe",
            "300": "#93c5fd",
            "400": "#60a5fa",
            "500": "#3b82f6",
            "600": "#2563eb",
            "700": "#1d4ed8",
            "800": "#1e40af",
            "900": "#1e3a8a",
            "950": "#172554",
        },
    },
    "SIDEBAR": {
        "show_search": False,
        "show_all_applications": False,
        "navigation": [
            {
                "items": [
                    {"title": _("Dashboard"), "icon": "space_dashboard", "link": reverse_lazy("admin:index")},
                ],
            },
            {
                "title": _("Front desk"),
                "items": [
                    {"title": _("Customers"), "icon": "groups", "link": reverse_lazy("admin:django_app_customer_changelist")},
                    {"title": _("Vehicles"), "icon": "directions_car", "link": reverse_lazy("admin:django_app_vehicle_changelist"), "badge": "django_app.dashboard.badge_vehicles_in_shop", "badge_variant": "info"},
                    {
                        "title": _("Bookings"),
                        "icon": "event",
                        "link": reverse_lazy("admin:django_app_booking_changelist"),
                        "badge": "django_app.dashboard.badge_bookings",
                        "badge_variant": "info",
                    },
                    {"title": _("Service catalog"), "icon": "build", "link": reverse_lazy("admin:django_app_service_changelist")},
                    {"title": _("Service categories"), "icon": "category", "link": reverse_lazy("admin:django_app_servicecategory_changelist")},
                    {"title": _("Blog"), "icon": "newspaper", "link": reverse_lazy("admin:django_app_blogpost_changelist")},
                ],
            },
            {
                "title": _("Workshop"),
                "items": [
                    {
                        "title": _("Work orders"),
                        "icon": "handyman",
                        "link": reverse_lazy("admin:django_app_repairjob_changelist"),
                        "badge": "django_app.dashboard.badge_jobs",
                        "badge_variant": "primary",
                    },
                    {"title": _("Inspections"), "icon": "fact_check", "link": reverse_lazy("admin:django_app_inspection_changelist")},
                    {"title": _("Technicians"), "icon": "engineering", "link": reverse_lazy("admin:django_app_mechanic_changelist")},
                    {"title": _("Staff"), "icon": "badge", "link": reverse_lazy("admin:django_app_staff_changelist")},
                ],
            },
            {
                "title": _("Stock & billing"),
                "items": [
                    {
                        "title": _("Parts inventory"),
                        "icon": "inventory_2",
                        "link": reverse_lazy("admin:django_app_sparepart_changelist"),
                        "badge": "django_app.dashboard.badge_low_stock",
                        "badge_variant": "danger",
                    },
                    {"title": _("Part categories"), "icon": "category", "link": reverse_lazy("admin:django_app_sparepartcategory_changelist")},
                    {"title": _("Parts usage"), "icon": "playlist_add", "link": reverse_lazy("admin:django_app_partsusage_changelist")},
                    {
                        "title": _("Part requests"),
                        "icon": "shopping_bag",
                        "link": reverse_lazy("admin:django_app_partrequest_changelist"),
                        "badge": "django_app.dashboard.badge_part_requests",
                        "badge_variant": "warning",
                    },
                    {"title": _("Invoices"), "icon": "receipt_long", "link": reverse_lazy("admin:django_app_invoice_changelist"), "badge": "django_app.dashboard.badge_unpaid_invoices", "badge_variant": "warning"},
                    {"title": _("Payments"), "icon": "payments", "link": reverse_lazy("admin:django_app_payment_changelist")},
                ],
            },
            {
                "title": _("Accounts"),
                "collapsible": True,
                "items": [
                    {"title": _("Roles"), "icon": "badge", "link": reverse_lazy("admin:django_app_role_changelist")},
                    {"title": _("Users"), "icon": "person", "link": reverse_lazy("admin:django_app_user_changelist")},
                ],
            },
        ],
    },
}

MAILERS = {
    "default": {
        "BACKEND": "django.core.mail.backends.console.EmailBackend",
    },
}

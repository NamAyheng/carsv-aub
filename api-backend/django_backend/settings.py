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
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get(
        "DJANGO_ALLOWED_HOSTS",
        "127.0.0.1,localhost,testserver,api",
    ).split(",")
    if h.strip()
]

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
    "whitenoise.middleware.WhiteNoiseMiddleware",
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

# Database: local default remains SQLite. Render provides DATABASE_URL; Compose uses POSTGRES_*.
def _database_from_url(url: str) -> dict:
    from urllib.parse import unquote, urlparse

    parsed = urlparse(url)
    scheme = (parsed.scheme or "").split("+")[0].lower()
    if scheme in ("postgres", "postgresql"):
        engine = "django.db.backends.postgresql"
    else:
        raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme!r}")
    return {
        "ENGINE": engine,
        "NAME": unquote((parsed.path or "").lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 60,
    }


_DATABASE_URL = (os.environ.get("DATABASE_URL") or "").strip()
_DB_ENGINE = os.environ.get("DATABASE_ENGINE", "sqlite").strip().lower()
if _DATABASE_URL:
    DATABASES = {"default": _database_from_url(_DATABASE_URL)}
elif _DB_ENGINE in ("postgres", "postgresql", "pgsql"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "carsv"),
            "USER": os.environ.get("POSTGRES_USER", "carsv"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "carsv"),
            "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }
else:
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
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"
        if not DEBUG
        else "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
MEDIA_URL = "media/"
MEDIA_ROOT = Path(os.environ.get("DJANGO_MEDIA_ROOT", str(BASE_DIR / "media")))
# Django serves this folder while DEBUG is on. In production, serve MEDIA_ROOT at MEDIA_URL.
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME", "")
# Optional: set the same value in BotFather setWebhook secret_token header.
TELEGRAM_WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")

# Public frontend origin for email verification / reset links (no trailing slash).
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")

# Email — local default: console. Render Free blocks SMTP; use Resend HTTPS backend.
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587") or "587")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "1") == "1"
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "0") == "1"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "CarSV <noreply@carsv.local>")
EMAIL_VERIFY_RESEND_COOLDOWN = int(os.environ.get("EMAIL_VERIFY_RESEND_COOLDOWN", "60") or "60")
# Customer form email verification OTP (6 digits).
EMAIL_OTP_MAX_AGE = int(os.environ.get("EMAIL_OTP_MAX_AGE", "600") or "600")  # 10 minutes
EMAIL_OTP_MAX_ATTEMPTS = int(os.environ.get("EMAIL_OTP_MAX_ATTEMPTS", "5") or "5")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "carsv-auth",
    }
}

_TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"
REFRESH_COOKIE_NAME = "carsv_refresh"
REFRESH_COOKIE_PATH = "/api/auth/"
REFRESH_COOKIE_SECURE = os.environ.get("DJANGO_COOKIE_SECURE", "0") == "1"
# Lax for local same-site; None for cross-site Static Site ↔ API on Render (requires Secure).
_REFRESH_SAMESITE = (os.environ.get("DJANGO_REFRESH_COOKIE_SAMESITE") or "Lax").strip().capitalize()
if _REFRESH_SAMESITE not in ("Lax", "Strict", "None"):
    _REFRESH_SAMESITE = "Lax"
REFRESH_COOKIE_SAMESITE = _REFRESH_SAMESITE

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "DJANGO_CSRF_TRUSTED_ORIGINS",
        "http://127.0.0.1:3000,http://localhost:3000",
    ).split(",")
    if o.strip()
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
        # Match web-frontend CarSV brand: yellow / black / white (#ffc400)
        "primary": {
            "50": "#fff8e1",
            "100": "#ffecb3",
            "200": "#ffe082",
            "300": "#ffd54f",
            "400": "#ffc400",
            "500": "#ffd54f",
            "600": "#ffc400",
            "700": "#e6b000",
            "800": "#c99700",
            "900": "#a67c00",
            "950": "#141519",
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
                    {
                        "title": _("Customers"),
                        "icon": "groups",
                        "link": reverse_lazy("admin:django_app_customer_changelist"),
                        "permission": "django_app.role_access.can_nav_customers",
                    },
                    {
                        "title": _("Vehicles"),
                        "icon": "directions_car",
                        "link": reverse_lazy("admin:django_app_vehicle_changelist"),
                        "badge": "django_app.dashboard.badge_vehicles_in_shop",
                        "badge_variant": "info",
                        "permission": "django_app.role_access.can_nav_vehicles",
                    },
                    {
                        "title": _("Bookings"),
                        "icon": "event",
                        "link": reverse_lazy("admin:django_app_booking_changelist"),
                        "badge": "django_app.dashboard.badge_bookings",
                        "badge_variant": "info",
                        "permission": "django_app.role_access.can_nav_bookings",
                    },
                    {
                        "title": _("Service catalog"),
                        "icon": "build",
                        "link": reverse_lazy("admin:django_app_service_changelist"),
                        "permission": "django_app.role_access.can_nav_services",
                    },
                    {
                        "title": _("Service categories"),
                        "icon": "category",
                        "link": reverse_lazy("admin:django_app_servicecategory_changelist"),
                        "permission": "django_app.role_access.can_nav_service_categories",
                    },
                    {
                        "title": _("Blog"),
                        "icon": "newspaper",
                        "link": reverse_lazy("admin:django_app_blogpost_changelist"),
                        "permission": "django_app.role_access.can_nav_blog",
                    },
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
                        "permission": "django_app.role_access.can_nav_repair_jobs",
                    },
                    {
                        "title": _("Inspections"),
                        "icon": "fact_check",
                        "link": reverse_lazy("admin:django_app_inspection_changelist"),
                        "permission": "django_app.role_access.can_nav_inspections",
                    },
                    {
                        "title": _("Technicians"),
                        "icon": "engineering",
                        "link": reverse_lazy("admin:django_app_mechanic_changelist"),
                        "permission": "django_app.role_access.can_nav_mechanics",
                    },
                    {
                        "title": _("Staff"),
                        "icon": "badge",
                        "link": reverse_lazy("admin:django_app_staff_changelist"),
                        "permission": "django_app.role_access.can_nav_staff",
                    },
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
                        "permission": "django_app.role_access.can_nav_spare_parts",
                    },
                    {
                        "title": _("Part categories"),
                        "icon": "category",
                        "link": reverse_lazy("admin:django_app_sparepartcategory_changelist"),
                        "permission": "django_app.role_access.can_nav_part_categories",
                    },
                    {
                        "title": _("Parts usage"),
                        "icon": "playlist_add",
                        "link": reverse_lazy("admin:django_app_partsusage_changelist"),
                        "permission": "django_app.role_access.can_nav_parts_usage",
                    },
                    {
                        "title": _("Part requests"),
                        "icon": "shopping_bag",
                        "link": reverse_lazy("admin:django_app_partrequest_changelist"),
                        "badge": "django_app.dashboard.badge_part_requests",
                        "badge_variant": "warning",
                        "permission": "django_app.role_access.can_nav_part_requests",
                    },
                    {
                        "title": _("Invoices"),
                        "icon": "receipt_long",
                        "link": reverse_lazy("admin:django_app_invoice_changelist"),
                        "badge": "django_app.dashboard.badge_unpaid_invoices",
                        "badge_variant": "warning",
                        "permission": "django_app.role_access.can_nav_invoices",
                    },
                    {
                        "title": _("Payments"),
                        "icon": "payments",
                        "link": reverse_lazy("admin:django_app_payment_changelist"),
                        "permission": "django_app.role_access.can_nav_payments",
                    },
                    {
                        "title": _("Reports"),
                        "icon": "summarize",
                        "link": reverse_lazy("admin:django_app_garagereport_changelist"),
                        "permission": "django_app.role_access.can_nav_reports",
                    },
                ],
            },
            {
                "title": _("Accounts"),
                "collapsible": True,
                "items": [
                    {
                        "title": _("Roles"),
                        "icon": "badge",
                        "link": reverse_lazy("admin:django_app_role_changelist"),
                        "permission": "django_app.role_access.can_nav_roles",
                    },
                    {
                        "title": _("Users"),
                        "icon": "person",
                        "link": reverse_lazy("admin:django_app_user_changelist"),
                        "permission": "django_app.role_access.can_nav_users",
                    },
                ],
            },
        ],
    },
}


"""
Django settings for django_backend project.
"""

from pathlib import Path

from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-gpswhb7*&4g*nu#3x4c9psdv$0gql+z)^1^gfsnuil9_9(mhxk"
DEBUG = True
ALLOWED_HOSTS = []

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
    "django_app",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
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
                    {"title": _("Groups"), "icon": "admin_panel_settings", "link": reverse_lazy("admin:auth_group_changelist")},
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

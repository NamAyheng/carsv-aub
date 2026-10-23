from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _configure_sqlite(sender, connection, **kwargs):
    """Reduce 'database is locked' when runserver + poll_telegram share SQLite."""
    if connection.vendor != "sqlite":
        return
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        cursor.execute("PRAGMA synchronous=NORMAL;")


class DjangoAppConfig(AppConfig):
    name = "django_app"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        connection_created.connect(_configure_sqlite)
        from django_app import signals  # noqa: F401 — register receivers
        self._patch_admin_site()
        self._register_admin_reports_url()

    @staticmethod
    def _patch_admin_site():
        """Staff roles only — customers stay on the React portal."""
        from django.contrib import admin

        from django_app.role_access import can_use_admin

        if getattr(admin.site, "_carsv_role_gate", False):
            return

        def has_permission(request):
            return can_use_admin(request.user)

        admin.site.has_permission = has_permission
        admin.site._carsv_role_gate = True

    @staticmethod
    def _register_admin_reports_url():
        """Keep /admin/garage-reports/ as an alias to the Reports admin menu item."""
        from django.contrib import admin
        from django.shortcuts import redirect
        from django.urls import path

        if getattr(admin.site, "_carsv_reports_urls", False):
            return

        original_get_urls = admin.site.get_urls

        def get_urls():
            def _alias(request):
                return redirect("admin:django_app_garagereport_changelist")

            custom = [
                path(
                    "garage-reports/",
                    admin.site.admin_view(_alias),
                    name="carsv_garage_reports",
                ),
            ]
            return custom + original_get_urls()

        admin.site.get_urls = get_urls
        admin.site._carsv_reports_urls = True

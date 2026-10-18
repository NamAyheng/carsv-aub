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

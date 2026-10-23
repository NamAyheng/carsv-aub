"""Django signals for CarSV account lifecycle."""

from django.conf import settings
from django.db.models.signals import pre_delete
from django.dispatch import receiver


@receiver(pre_delete, sender=settings.AUTH_USER_MODEL)
def clear_telegram_when_user_deleted(sender, instance, **kwargs):
    """When a login User is deleted, free their Telegram so the same email can reconnect."""
    customer = getattr(instance, "customer", None)
    if customer is None:
        return
    from django_app.telegram_bot import unbind_customer_chat

    unbind_customer_chat(customer)

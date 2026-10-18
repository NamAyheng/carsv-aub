from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0030_payment_vehicle_fk"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="telegram_alerts",
            field=models.BooleanField(
                default=True,
                help_text="When on, linked Telegram chats receive garage alerts.",
            ),
        ),
        migrations.AddField(
            model_name="customer",
            name="telegram_chat_id",
            field=models.CharField(
                blank=True,
                help_text="Telegram chat id for bot alerts (from Connect Telegram / Start).",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="customer",
            name="telegram_linked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="notification",
            name="telegram_sent",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="notification",
            name="kind",
            field=models.CharField(
                choices=[
                    ("BOOKING", "Booking"),
                    ("REPAIR", "Repair"),
                    ("INVOICE", "Invoice"),
                    ("PAYMENT", "Payment"),
                    ("QUOTE", "Quotation"),
                    ("MAINTENANCE", "Maintenance"),
                    ("ACCOUNT", "Account"),
                    ("VEHICLE", "Vehicle"),
                ],
                default="BOOKING",
                max_length=20,
            ),
        ),
    ]

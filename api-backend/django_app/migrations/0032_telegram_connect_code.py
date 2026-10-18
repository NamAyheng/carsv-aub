from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0031_telegram_customer_alerts"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="telegram_connect_code",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="One-time code embedded in t.me/Bot?start=… for linking.",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="customer",
            name="telegram_connect_expires",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

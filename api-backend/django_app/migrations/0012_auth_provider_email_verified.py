from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("django_app", "0011_user_email_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_verified",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="email_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="email_is_placeholder",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="AuthProvider",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(choices=[("google", "Google"), ("telegram", "Telegram")], max_length=20)),
                ("provider_user_id", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="auth_providers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="authprovider",
            constraint=models.UniqueConstraint(fields=("provider", "provider_user_id"), name="unique_provider_identity"),
        ),
        migrations.AddConstraint(
            model_name="authprovider",
            constraint=models.UniqueConstraint(fields=("user", "provider"), name="unique_user_provider"),
        ),
    ]

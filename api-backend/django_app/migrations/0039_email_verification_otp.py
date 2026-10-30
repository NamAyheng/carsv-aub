from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0038_service_package_items"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailVerificationOTP",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code_hash", models.CharField(max_length=64)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("attempt_count", models.PositiveSmallIntegerField(default=0)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="email_verification_otps",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="emailverificationotp",
            index=models.Index(fields=["user", "-created_at"], name="django_app__user_id_2909c0_idx"),
        ),
    ]

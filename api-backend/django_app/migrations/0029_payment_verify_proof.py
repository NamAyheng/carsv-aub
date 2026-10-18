from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django_app.uploads


def forwards_payment_status(apps, schema_editor):
    Payment = apps.get_model("django_app", "Payment")
    Payment.objects.filter(status="UNPAID").update(status="PENDING")
    Payment.objects.filter(status="PARTIAL").update(status="PAID")


def backwards_payment_status(apps, schema_editor):
    Payment = apps.get_model("django_app", "Payment")
    Payment.objects.filter(status="PENDING").update(status="UNPAID")


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("django_app", "0028_partrequest_cancelled"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="proof_image",
            field=models.ImageField(
                blank=True,
                help_text="Cash bill or digital transaction screenshot. Required before Verify.",
                upload_to="payments/%Y/%m/",
                validators=[django_app.uploads.validate_uploaded_image],
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="verified_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payments_verified",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(forwards_payment_status, backwards_payment_status),
        migrations.AlterField(
            model_name="payment",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("PAID", "Paid"),
                    ("FAILED", "Failed"),
                    ("REFUNDED", "Refunded"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
    ]

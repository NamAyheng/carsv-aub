import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0019_part_request_confirm"),
    ]

    operations = [
        migrations.CreateModel(
            name="BookingService",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="added_services",
                        to="django_app.booking",
                    ),
                ),
                (
                    "service",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="booking_additions",
                        to="django_app.service",
                    ),
                ),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.AddConstraint(
            model_name="bookingservice",
            constraint=models.UniqueConstraint(fields=("booking", "service"), name="unique_service_on_visit"),
        ),
        migrations.AddField(
            model_name="partrequest",
            name="booking",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="part_requests",
                to="django_app.booking",
            ),
        ),
    ]

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0017_partsusage_stock_applied"),
    ]

    operations = [
        migrations.CreateModel(
            name="PartRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("number", models.CharField(blank=True, max_length=40, null=True, unique=True)),
                (
                    "fulfillment",
                    models.CharField(
                        choices=[
                            ("INSTALL_IN_WORKSHOP", "Workshop install"),
                            ("PICKUP_AT_COUNTER", "Counter pickup"),
                            ("DELIVERY", "Delivery"),
                        ],
                        default="INSTALL_IN_WORKSHOP",
                        max_length=32,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "Pending"), ("NOTED", "Noted by the garage")],
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="part_requests",
                        to="django_app.customer",
                    ),
                ),
                (
                    "spare_part",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="requests",
                        to="django_app.sparepart",
                    ),
                ),
                (
                    "vehicle",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="part_requests",
                        to="django_app.vehicle",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0037_inspection_recommendations"),
    ]

    operations = [
        migrations.CreateModel(
            name="ServicePackageItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(default=1)),
                (
                    "service",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="package_items",
                        to="django_app.service",
                    ),
                ),
                (
                    "spare_part",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="service_packages",
                        to="django_app.sparepart",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.AddConstraint(
            model_name="servicepackageitem",
            constraint=models.UniqueConstraint(
                fields=("service", "spare_part"),
                name="unique_part_on_service_package",
            ),
        ),
        migrations.AddField(
            model_name="partrequest",
            name="from_service",
            field=models.ForeignKey(
                blank=True,
                help_text="Catalog service whose package created this request.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="spawned_part_requests",
                to="django_app.service",
            ),
        ),
        migrations.AlterField(
            model_name="partrequest",
            name="source",
            field=models.CharField(
                choices=[
                    ("BOOKING", "Booked by customer"),
                    ("CUSTOMER", "Added by customer"),
                    ("INSPECTOR", "Recommended by inspector"),
                    ("SERVICE_PACKAGE", "From service package"),
                ],
                default="CUSTOMER",
                max_length=20,
            ),
        ),
    ]

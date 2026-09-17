from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0005_vehicle_notes"),
    ]

    operations = [
        migrations.AddField(
            model_name="inspection",
            name="front_brake_mm",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name="inspection",
            name="rear_brake_mm",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name="inspection",
            name="tire_tread_mm",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True),
        ),
    ]

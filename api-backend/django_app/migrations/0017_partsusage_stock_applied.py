from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0016_vehicle_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="partsusage",
            name="stock_applied",
            field=models.BooleanField(default=False),
        ),
    ]

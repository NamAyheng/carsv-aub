from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("django_app", "0027_inspection_status_stages"),
    ]

    operations = [
        migrations.AddField(
            model_name="partrequest",
            name="cancel_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="partrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("NOTED", "Noted by the garage"),
                    ("CONFIRMED", "Confirmed"),
                    ("CANCELLED", "Cancelled"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
    ]

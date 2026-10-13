import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0018_part_request"),
    ]

    operations = [
        migrations.AddField(
            model_name="partrequest",
            name="parts_usage",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="part_request",
                to="django_app.partsusage",
            ),
        ),
        migrations.AddField(
            model_name="partrequest",
            name="repair_job",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="part_requests",
                to="django_app.repairjob",
            ),
        ),
        migrations.AlterField(
            model_name="partrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("NOTED", "Noted by the garage"),
                    ("CONFIRMED", "Confirmed"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
    ]

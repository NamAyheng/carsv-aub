import django.db.models.deletion
import django_app.uploads
from django.db import migrations, models


def move_inspections_onto_work_orders(apps, schema_editor):
    Inspection = apps.get_model("django_app", "Inspection")
    InspectionImage = apps.get_model("django_app", "InspectionImage")
    RepairJob = apps.get_model("django_app", "RepairJob")
    Booking = apps.get_model("django_app", "Booking")

    RepairJob.objects.filter(status="WAITING_PARTS").update(status="REPAIRING", progress=60)
    Booking.objects.filter(status="WAITING_PARTS").update(status="REPAIRING")

    fuel_map = {
        "0": "0",
        "empty": "0",
        "25": "25",
        "1/4": "25",
        "quarter": "25",
        "50": "50",
        "half": "50",
        "1/2": "50",
        "75": "75",
        "3/4": "75",
        "100": "100",
        "full": "100",
    }
    later = {"WAITING_APPROVAL", "REPAIRING", "QUALITY_CHECK", "READY_FOR_PICKUP", "COMPLETED"}
    claimed = set()
    for row in Inspection.objects.order_by("id"):
        job = RepairJob.objects.filter(booking_id=row.booking_id).first() if row.booking_id else None
        if job is None or job.id in claimed:
            row.delete()
            continue
        claimed.add(job.id)
        raw = (row.fuel_level or "").strip().lower().replace("tank", "").replace("%", "").strip()
        fuel = fuel_map.get(raw, "")
        photo = (getattr(row, "photos", "") or "").strip()
        Inspection.objects.filter(pk=row.pk).update(
            repair_job_id=job.id,
            fuel_level=fuel[:3],
            status="COMPLETED" if job.status in later else "CHECKING",
        )
        if photo and not photo.startswith(("http://", "https://")):
            InspectionImage.objects.create(inspection_id=row.pk, image=photo)


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0023_progress_follows_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="inspection",
            name="repair_job",
            field=models.OneToOneField(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inspection",
                to="django_app.repairjob",
            ),
        ),
        migrations.AddField(
            model_name="inspection",
            name="status",
            field=models.CharField(
                choices=[("CHECKING", "Checking"), ("COMPLETED", "Completed Check")],
                default="CHECKING",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="InspectionImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "image",
                    models.ImageField(
                        upload_to="inspections/%Y/%m/",
                        validators=[django_app.uploads.validate_uploaded_image],
                    ),
                ),
                (
                    "inspection",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="django_app.inspection",
                    ),
                ),
            ],
        ),
        migrations.RunPython(move_inspections_onto_work_orders, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="inspection",
            name="repair_job",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inspection",
                to="django_app.repairjob",
            ),
        ),
        migrations.RemoveField(
            model_name="inspection",
            name="booking",
        ),
        migrations.RemoveField(
            model_name="inspection",
            name="complaint",
        ),
        migrations.RemoveField(
            model_name="inspection",
            name="photos",
        ),
        migrations.RemoveField(
            model_name="repairjob",
            name="diagnosis",
        ),
        migrations.AlterField(
            model_name="inspection",
            name="fuel_level",
            field=models.CharField(
                blank=True,
                choices=[("0", "0%"), ("25", "25%"), ("50", "50%"), ("75", "75%"), ("100", "100%")],
                max_length=3,
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("CONFIRMED", "Confirmed"),
                    ("WAITING", "Waiting"),
                    ("DIAGNOSING", "Inspection"),
                    ("WAITING_APPROVAL", "Waiting for approval"),
                    ("REPAIRING", "Repairing"),
                    ("QUALITY_CHECK", "Quality check"),
                    ("READY_FOR_PICKUP", "Ready for pickup"),
                    ("CHECKED_IN", "Checked-in"),
                    ("IN_SERVICE", "In service"),
                    ("COMPLETED", "Completed"),
                    ("CANCELLED", "Cancelled"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="repairjob",
            name="status",
            field=models.CharField(
                choices=[
                    ("WAITING", "Waiting"),
                    ("DIAGNOSING", "Inspection"),
                    ("WAITING_APPROVAL", "Waiting for approval"),
                    ("REPAIRING", "Repairing"),
                    ("QUALITY_CHECK", "Quality check"),
                    ("READY_FOR_PICKUP", "Ready for pickup"),
                    ("COMPLETED", "Completed"),
                ],
                default="WAITING",
                max_length=30,
            ),
        ),
    ]

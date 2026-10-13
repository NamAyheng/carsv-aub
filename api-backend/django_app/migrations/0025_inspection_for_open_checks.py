from django.db import migrations


def add_missing_checks(apps, schema_editor):
    Inspection = apps.get_model("django_app", "Inspection")
    RepairJob = apps.get_model("django_app", "RepairJob")
    Vehicle = apps.get_model("django_app", "Vehicle")
    for job in RepairJob.objects.filter(status="DIAGNOSING"):
        if Inspection.objects.filter(repair_job_id=job.id).exists():
            continue
        mileage = Vehicle.objects.filter(pk=job.vehicle_id).values_list("mileage", flat=True).first() or 0
        Inspection.objects.create(
            repair_job_id=job.id,
            mileage=mileage,
            status="CHECKING",
            fuel_level="",
        )


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0024_inspection_follows_work_order"),
    ]

    operations = [
        migrations.RunPython(add_missing_checks, migrations.RunPython.noop),
    ]

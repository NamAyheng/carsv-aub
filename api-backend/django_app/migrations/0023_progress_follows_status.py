from django.db import migrations


PROGRESS = {
    "WAITING": 0,
    "DIAGNOSING": 20,
    "WAITING_APPROVAL": 40,
    "REPAIRING": 60,
    "WAITING_PARTS": 60,
    "QUALITY_CHECK": 80,
    "READY_FOR_PICKUP": 90,
    "COMPLETED": 100,
}


def set_progress_from_status(apps, schema_editor):
    RepairJob = apps.get_model("django_app", "RepairJob")
    for status, progress in PROGRESS.items():
        RepairJob.objects.filter(status=status).update(progress=progress)


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0022_open_visits_have_work_orders"),
    ]

    operations = [
        migrations.RunPython(set_progress_from_status, migrations.RunPython.noop),
    ]

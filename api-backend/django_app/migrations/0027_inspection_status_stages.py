from django.db import migrations, models


def forwards(apps, schema_editor):
    Inspection = apps.get_model("django_app", "Inspection")
    Inspection.objects.filter(status="CHECKING").update(status="CHECK_IN")


def backwards(apps, schema_editor):
    Inspection = apps.get_model("django_app", "Inspection")
    Inspection.objects.filter(status="PENDING").update(status="CHECKING")
    Inspection.objects.filter(status="CHECK_IN").update(status="CHECKING")


class Migration(migrations.Migration):
    dependencies = [
        ("django_app", "0026_repair_cancelled_from_quote"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name="inspection",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("CHECK_IN", "Check-in"),
                    ("COMPLETED", "Completed"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
    ]

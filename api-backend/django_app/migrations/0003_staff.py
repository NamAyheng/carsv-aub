import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_staff_fks(apps, schema_editor):
    User = apps.get_model("django_app", "User")
    Staff = apps.get_model("django_app", "Staff")
    Inspection = apps.get_model("django_app", "Inspection")
    PartsUsage = apps.get_model("django_app", "PartsUsage")
    Payment = apps.get_model("django_app", "Payment")

    by_user = {}
    for user in User.objects.exclude(role="CUSTOMER"):
        staff, _ = Staff.objects.get_or_create(
            user_id=user.id,
            defaults={
                "department": user.department,
                "position": user.position,
                "status": "ACTIVE",
            },
        )
        by_user[user.id] = staff

    for row in Inspection.objects.all():
        if row.staff_user_id:
            row.staff = by_user.get(row.staff_user_id)
            row.save(update_fields=["staff"])

    for row in PartsUsage.objects.all():
        if row.recorded_by_user_id:
            row.recorded_by = by_user.get(row.recorded_by_user_id)
            row.save(update_fields=["recorded_by"])

    for row in Payment.objects.all():
        if row.received_by_user_id:
            row.received_by = by_user.get(row.received_by_user_id)
            row.save(update_fields=["received_by"])


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0002_sparepartcategory"),
    ]

    operations = [
        migrations.CreateModel(
            name="Staff",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("department", models.CharField(blank=True, max_length=80)),
                ("position", models.CharField(blank=True, max_length=80)),
                ("status", models.CharField(choices=[("ACTIVE", "Active"), ("INACTIVE", "Inactive")], default="ACTIVE", max_length=20)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="staff_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "staff",
            },
        ),
        migrations.RenameField(model_name="inspection", old_name="staff", new_name="staff_user"),
        migrations.RenameField(model_name="partsusage", old_name="recorded_by", new_name="recorded_by_user"),
        migrations.RenameField(model_name="payment", old_name="received_by", new_name="received_by_user"),
        migrations.AddField(
            model_name="inspection",
            name="staff",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="inspections",
                to="django_app.staff",
            ),
        ),
        migrations.AddField(
            model_name="partsusage",
            name="recorded_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="parts_recorded",
                to="django_app.staff",
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="received_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payments_taken",
                to="django_app.staff",
            ),
        ),
        migrations.RunPython(copy_staff_fks, migrations.RunPython.noop),
        migrations.RemoveField(model_name="inspection", name="staff_user"),
        migrations.RemoveField(model_name="partsusage", name="recorded_by_user"),
        migrations.RemoveField(model_name="payment", name="received_by_user"),
    ]

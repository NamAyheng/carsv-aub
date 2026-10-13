from django.db import migrations, models


def align_booking_with_work_orders(apps, schema_editor):
    Booking = apps.get_model("django_app", "Booking")
    RepairJob = apps.get_model("django_app", "RepairJob")
    for job in RepairJob.objects.all().iterator():
        Booking.objects.filter(pk=job.booking_id).exclude(status="CANCELLED").update(status=job.status)
    confirmed = Booking.objects.filter(status="CONFIRMED")
    for booking in confirmed.iterator():
        if RepairJob.objects.filter(booking_id=booking.pk).exists():
            continue
        RepairJob.objects.create(
            booking_id=booking.pk,
            customer_id=booking.customer_id,
            vehicle_id=booking.vehicle_id,
            problem=booking.problem or "",
            start_date=booking.booking_date,
            status="WAITING",
            progress=0,
        )
        Booking.objects.filter(pk=booking.pk).update(status="WAITING")


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0020_visit_services"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("CONFIRMED", "Confirmed"),
                    ("WAITING", "Waiting"),
                    ("DIAGNOSING", "Diagnosing"),
                    ("WAITING_APPROVAL", "Waiting for approval"),
                    ("REPAIRING", "Repairing"),
                    ("WAITING_PARTS", "Waiting for parts"),
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
        migrations.RunPython(align_booking_with_work_orders, migrations.RunPython.noop),
    ]

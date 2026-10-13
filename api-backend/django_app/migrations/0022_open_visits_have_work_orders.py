from django.db import migrations


JOB_STATUS = {
    "CHECKED_IN": "DIAGNOSING",
    "IN_SERVICE": "REPAIRING",
    "WAITING": "WAITING",
    "DIAGNOSING": "DIAGNOSING",
    "WAITING_APPROVAL": "WAITING_APPROVAL",
    "REPAIRING": "REPAIRING",
    "WAITING_PARTS": "WAITING_PARTS",
    "QUALITY_CHECK": "QUALITY_CHECK",
    "READY_FOR_PICKUP": "READY_FOR_PICKUP",
    "COMPLETED": "COMPLETED",
}


def open_missing_work_orders(apps, schema_editor):
    Booking = apps.get_model("django_app", "Booking")
    RepairJob = apps.get_model("django_app", "RepairJob")
    Vehicle = apps.get_model("django_app", "Vehicle")
    visits = Booking.objects.exclude(status__in=["PENDING", "CONFIRMED", "CANCELLED"])
    for booking in visits.iterator():
        if RepairJob.objects.filter(booking_id=booking.pk).exists():
            continue
        status = JOB_STATUS.get(booking.status)
        if not status:
            continue
        RepairJob.objects.create(
            booking_id=booking.pk,
            customer_id=booking.customer_id,
            vehicle_id=booking.vehicle_id,
            problem=booking.problem or "",
            start_date=booking.booking_date,
            status=status,
            progress=100 if status == "COMPLETED" else 0,
        )
        if booking.status != status:
            Booking.objects.filter(pk=booking.pk).update(status=status)
        if status not in ("WAITING", "COMPLETED"):
            Vehicle.objects.filter(pk=booking.vehicle_id, status="ACTIVE").update(status="IN_SHOP")


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0021_booking_follows_work_order"),
    ]

    operations = [
        migrations.RunPython(open_missing_work_orders, migrations.RunPython.noop),
    ]

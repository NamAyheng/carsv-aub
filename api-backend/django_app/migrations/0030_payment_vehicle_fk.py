from django.db import migrations, models
import django.db.models.deletion


def forwards_fill_vehicle(apps, schema_editor):
    Payment = apps.get_model("django_app", "Payment")
    for payment in Payment.objects.select_related("invoice").iterator():
        if payment.invoice_id and payment.invoice.vehicle_id:
            Payment.objects.filter(pk=payment.pk).update(vehicle_id=payment.invoice.vehicle_id)


def backwards_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0029_payment_verify_proof"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="vehicle",
            field=models.ForeignKey(
                blank=True,
                help_text="Taken from the invoice vehicle.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="payments",
                to="django_app.vehicle",
            ),
        ),
        migrations.RunPython(forwards_fill_vehicle, backwards_noop),
        migrations.AlterField(
            model_name="payment",
            name="received_by",
            field=models.ForeignKey(
                blank=True,
                help_text="Staff who received the payment. Required before Verify.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payments_taken",
                to="django_app.staff",
            ),
        ),
    ]

from django.db import migrations, models


def clear_url_photos(apps, schema_editor):
    """Old values were remote/static URLs; ImageField needs file paths."""
    User = apps.get_model("django_app", "User")
    Customer = apps.get_model("django_app", "Customer")
    SparePart = apps.get_model("django_app", "SparePart")
    User.objects.exclude(photo="").update(photo="")
    Customer.objects.exclude(photo="").update(photo="")
    SparePart.objects.exclude(image="").update(image="")


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0009_sparepart_image"),
    ]

    operations = [
        migrations.RunPython(clear_url_photos, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="photo",
            field=models.ImageField(blank=True, upload_to="users/%Y/%m/"),
        ),
        migrations.AlterField(
            model_name="customer",
            name="photo",
            field=models.ImageField(blank=True, upload_to="customers/%Y/%m/"),
        ),
        migrations.AlterField(
            model_name="sparepart",
            name="image",
            field=models.ImageField(blank=True, upload_to="parts/%Y/%m/"),
        ),
    ]

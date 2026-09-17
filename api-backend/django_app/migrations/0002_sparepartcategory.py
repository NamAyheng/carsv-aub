import django.db.models.deletion
from django.db import migrations, models


def copy_categories(apps, schema_editor):
    SparePart = apps.get_model("django_app", "SparePart")
    SparePartCategory = apps.get_model("django_app", "SparePartCategory")
    for part in SparePart.objects.all():
        name = (part.category_name or "").strip() or "General"
        category, _ = SparePartCategory.objects.get_or_create(
            name=name,
            defaults={"status": "ACTIVE"},
        )
        part.category = category
        part.save(update_fields=["category"])


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="sparepart",
            old_name="category",
            new_name="category_name",
        ),
        migrations.CreateModel(
            name="SparePartCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80, unique=True)),
                ("status", models.CharField(default="ACTIVE", max_length=20)),
            ],
            options={
                "verbose_name_plural": "spare part categories",
            },
        ),
        migrations.AddField(
            model_name="sparepart",
            name="category",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="parts",
                to="django_app.sparepartcategory",
            ),
        ),
        migrations.RunPython(copy_categories, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="sparepart",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="parts",
                to="django_app.sparepartcategory",
            ),
        ),
        migrations.RemoveField(
            model_name="sparepart",
            name="category_name",
        ),
    ]

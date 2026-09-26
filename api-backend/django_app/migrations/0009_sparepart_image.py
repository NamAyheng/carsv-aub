from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("django_app", "0008_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="sparepart",
            name="image",
            field=models.URLField(blank=True),
        ),
    ]

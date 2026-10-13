from django.db import migrations, models


def prepare_unique_emails(apps, schema_editor):
    User = apps.get_model("django_app", "User")
    User.objects.filter(username="Ayheng").update(email="namayheng12345@gmail.com")
    Customer = apps.get_model("django_app", "Customer")
    Customer.objects.filter(user__username="Ayheng").update(email="namayheng12345@gmail.com")

    for user in User.objects.all():
        email = (user.email or "").strip()
        if not email:
            user.email = f"user-{user.pk}@carsv.local"
            user.save(update_fields=["email"])

    seen = {}
    for user in User.objects.order_by("id"):
        key = user.email.lower()
        if key in seen:
            user.email = f"{user.username}.{user.pk}@carsv.local"
            user.save(update_fields=["email"])
        else:
            seen[key] = user.pk


class Migration(migrations.Migration):
    dependencies = [
        ("django_app", "0010_media_image_fields"),
    ]

    operations = [
        migrations.RunPython(prepare_unique_emails, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(max_length=254, unique=True, verbose_name="email address"),
        ),
    ]

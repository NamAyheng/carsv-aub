from django.db import migrations


def sync_user_profile_links(apps, schema_editor):
    User = apps.get_model("django_app", "User")
    Customer = apps.get_model("django_app", "Customer")
    Staff = apps.get_model("django_app", "Staff")
    Mechanic = apps.get_model("django_app", "Mechanic")

    for user in User.objects.all():
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        Customer.objects.filter(user_id=user.id).update(
            name=full_name,
            email=user.email or "",
            phone=user.phone,
            photo=user.photo,
            status=user.status,
        )
        Staff.objects.filter(user_id=user.id).update(
            department=user.department,
            position=user.position,
            status=user.status,
        )
        Mechanic.objects.filter(user_id=user.id).update(status=user.status)
        if user.role != "CUSTOMER" and not user.is_staff:
            User.objects.filter(pk=user.pk).update(is_staff=True)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("django_app", "0006_inspection_measurements"),
    ]

    operations = [
        migrations.RunPython(sync_user_profile_links, noop),
    ]

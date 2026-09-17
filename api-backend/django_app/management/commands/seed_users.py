from datetime import date, time
from decimal import Decimal

from django.core.management.base import BaseCommand

from django_app.models import (
    Booking,
    Customer,
    Inspection,
    Invoice,
    Mechanic,
    PartsUsage,
    Payment,
    RepairJob,
    Service,
    ServiceCategory,
    SparePart,
    SparePartCategory,
    Staff,
    User,
    Vehicle,
    ensure_default_roles,
)


class Command(BaseCommand):
    help = "Fill every table with sample garage data for admin"

    def handle(self, *args, **options):
        ensure_default_roles()
        admin_user = self._user(
            "administrator",
            email="admin@carsv.com",
            first="Admin",
            last="CarSV",
            role=User.Role.ADMIN,
            phone="+855 23 900 100",
            position="Administrator",
            department="Office",
            password="Admin123!@#",
            staff=True,
            superuser=True,
        )
        sokha = self._user(
            "sokha",
            email="sokha@carsv.com",
            first="Sokha",
            last="Chan",
            role=User.Role.RECEPTIONIST,
            phone="+855 12 330 441",
            position="Front desk",
            department="Reception",
            password="Staff123!@#",
            staff=True,
        )
        dara = self._user(
            "dara",
            email="dara@carsv.com",
            first="Dara",
            last="Kim",
            role=User.Role.MECHANIC,
            phone="+855 16 882 119",
            position="Senior mechanic",
            department="Workshop",
            password="Staff123!@#",
            staff=True,
        )
        lin = self._user(
            "lin",
            email="lin@carsv.com",
            first="Lin",
            last="Pov",
            role=User.Role.CASHIER,
            phone="+855 77 221 008",
            position="Cashier",
            department="Finance",
            password="Staff123!@#",
            staff=True,
        )
        ayheng_user = self._user(
            "Ayheng",
            email="ayheng@carsv.com",
            first="Ayheng",
            last="Nam",
            role=User.Role.CUSTOMER,
            phone="+855 10 778 221",
            password="AyhengCarSV!23",
        )
        tharo_user = self._user(
            "Tharo",
            email="tharo@carsv.com",
            first="Tharo",
            last="Meas",
            role=User.Role.CUSTOMER,
            phone="+855 15 664 902",
            password="TharoCarSV!23",
        )

        ayheng = self._customer(
            ayheng_user,
            name="Ayheng Nam",
            gender=Customer.Gender.MALE,
            phone="+855 10 778 221",
            email="ayheng@carsv.com",
            address="No. 88, Street 310, Sangkat Boeung Keng Kang I, Khan Chamkarmon, Phnom Penh",
        )
        tharo = self._customer(
            tharo_user,
            name="Tharo Meas",
            gender=Customer.Gender.MALE,
            phone="+855 15 664 902",
            email="tharo@carsv.com",
            address="House 12, Street 598, Sangkat Boeung Kak II, Khan Toul Kork, Phnom Penh",
        )

        civic = self._vehicle(
            ayheng,
            plate="KH-5521",
            brand="Honda",
            model="Civic",
            year=2021,
            color="White",
            vehicle_type="Sedan",
            vin="JHMFC2F64MX001221",
            engine_number="R18Z-8821",
            mileage=42800,
            status=Vehicle.Status.ACTIVE,
            next_service_date=date(2026, 12, 1),
            next_service_mileage=48000,
        )
        ranger = self._vehicle(
            tharo,
            plate="KH-7740",
            brand="Ford",
            model="Ranger",
            year=2019,
            color="Grey",
            vehicle_type="Pickup",
            vin="MNFSXXMA2KKA01740",
            engine_number="P5AT-4410",
            mileage=89100,
            status=Vehicle.Status.IN_SHOP,
        )

        brake = self._category("Brake")
        engine = self._category("Engine")
        maintenance = self._category("Maintenance")

        brake_service = self._service(
            brake,
            "Brake pad replacement",
            "Replace front brake pads and check discs.",
            Decimal("85.00"),
            90,
        )
        oil_service = self._service(
            engine,
            "Oil change",
            "Engine oil and filter replacement.",
            Decimal("35.00"),
            45,
        )
        self._service(
            maintenance,
            "General inspection",
            "Full vehicle health check.",
            Decimal("25.00"),
            60,
        )

        admin_staff = self._staff(admin_user, department="Office", position="Administrator")
        sokha_staff = self._staff(sokha, department="Reception", position="Front desk")
        dara_staff = self._staff(dara, department="Workshop", position="Senior mechanic")
        lin_staff = self._staff(lin, department="Finance", position="Cashier")

        mechanic, _ = Mechanic.objects.get_or_create(user=dara)
        mechanic.skills = "Brakes, engine, electrics"
        mechanic.specialization = "Brake systems"
        mechanic.available = True
        mechanic.status = Mechanic.Status.ACTIVE
        mechanic.save()

        part_brake = self._part_category("Brake")
        part_engine = self._part_category("Engine")

        pads, _ = SparePart.objects.get_or_create(
            part_number="BRK-PAD-F01",
            defaults={"name": "Front brake pads", "category": part_brake},
        )
        pads.name = "Front brake pads"
        pads.category = part_brake
        pads.brand = "Brembo"
        pads.unit_price = Decimal("42.00")
        pads.quantity = 18
        pads.min_stock = 4
        pads.status = SparePart.Status.ACTIVE
        pads.save()

        oil_filter, _ = SparePart.objects.get_or_create(
            part_number="ENG-OIL-H01",
            defaults={"name": "Honda oil filter", "category": part_engine},
        )
        oil_filter.name = "Honda oil filter"
        oil_filter.category = part_engine
        oil_filter.brand = "Honda"
        oil_filter.unit_price = Decimal("8.50")
        oil_filter.quantity = 2
        oil_filter.min_stock = 5
        oil_filter.status = SparePart.Status.ACTIVE
        oil_filter.save()

        done_booking, _ = Booking.objects.get_or_create(
            customer=ayheng,
            vehicle=civic,
            booking_date=date(2026, 9, 12),
            defaults={"service": brake_service},
        )
        done_booking.service = brake_service
        done_booking.booking_time = time(9, 30)
        done_booking.problem = "Squeaking when braking."
        done_booking.note = "Customer wants front pads only."
        done_booking.status = Booking.Status.COMPLETED
        done_booking.save()

        pending_booking, _ = Booking.objects.get_or_create(
            customer=tharo,
            vehicle=ranger,
            booking_date=date(2026, 9, 20),
            defaults={"service": oil_service},
        )
        pending_booking.service = oil_service
        pending_booking.booking_time = time(14, 0)
        pending_booking.problem = "Oil warning light on."
        pending_booking.note = "Walk-in if earlier slot opens."
        pending_booking.status = Booking.Status.PENDING
        pending_booking.save()

        inspection, _ = Inspection.objects.get_or_create(booking=done_booking)
        inspection.mileage = 42800
        inspection.fuel_level = "75%"
        inspection.front_brake_mm = Decimal("2.5")
        inspection.rear_brake_mm = Decimal("6.8")
        inspection.tire_tread_mm = Decimal("5.2")
        inspection.condition = "Good body, noisy front brakes."
        inspection.damage = "Small scratch on rear bumper."
        inspection.complaint = "Squeak from front wheels."
        inspection.note = "Checked in at reception."
        inspection.staff = sokha_staff
        inspection.save()

        job, _ = RepairJob.objects.get_or_create(
            booking=done_booking,
            defaults={"customer": ayheng, "vehicle": civic},
        )
        job.customer = ayheng
        job.vehicle = civic
        job.mechanic = mechanic
        job.problem = done_booking.problem
        job.diagnosis = "Front pads worn to 2mm. Discs still ok."
        job.start_date = date(2026, 9, 12)
        job.estimated_end = date(2026, 9, 12)
        job.status = RepairJob.Status.COMPLETED
        job.progress = 100
        job.save()

        usage, _ = PartsUsage.objects.get_or_create(
            repair_job=job,
            spare_part=pads,
            defaults={"quantity": 1, "unit_price": pads.unit_price},
        )
        usage.quantity = 1
        usage.unit_price = pads.unit_price
        usage.recorded_by = dara_staff
        usage.save()

        invoice, _ = Invoice.objects.get_or_create(
            number="INV-2026-0001",
            defaults={
                "customer": ayheng,
                "vehicle": civic,
                "repair_job": job,
            },
        )
        invoice.customer = ayheng
        invoice.vehicle = civic
        invoice.repair_job = job
        invoice.labor_cost = Decimal("40.00")
        invoice.service_cost = Decimal("85.00")
        invoice.parts_cost = Decimal("42.00")
        invoice.discount = Decimal("5.00")
        invoice.tax = Decimal("8.10")
        invoice.status = Invoice.Status.PAID
        invoice.save()

        payment, _ = Payment.objects.get_or_create(
            number="PAY-2026-0001",
            defaults={
                "invoice": invoice,
                "customer": ayheng,
                "amount": invoice.grand_total,
                "paid_at": date(2026, 9, 12),
            },
        )
        payment.invoice = invoice
        payment.customer = ayheng
        payment.amount = invoice.grand_total
        payment.method = Payment.Method.CASH
        payment.paid_at = date(2026, 9, 12)
        payment.reference = "CASH-0912"
        payment.received_by = lin_staff
        payment.status = Payment.Status.PAID
        payment.receipt_number = "RCT-2026-0001"
        payment.save()

        self.stdout.write(self.style.SUCCESS("Sample data loaded for all garage tables"))

    def _user(self, username, **kwargs):
        user, _ = User.objects.get_or_create(username=username)
        user.email = kwargs["email"]
        user.first_name = kwargs["first"]
        user.last_name = kwargs["last"]
        user.role = kwargs["role"]
        user.status = User.Status.ACTIVE
        user.phone = kwargs.get("phone", "")
        user.position = kwargs.get("position", "")
        user.department = kwargs.get("department", "")
        user.is_staff = kwargs.get("staff", False)
        user.is_superuser = kwargs.get("superuser", False)
        user.set_password(kwargs["password"])
        user.save()
        return user

    def _staff(self, user, **kwargs):
        staff, _ = Staff.objects.get_or_create(user=user)
        staff.department = kwargs.get("department", "")
        staff.position = kwargs.get("position", "")
        staff.status = Staff.Status.ACTIVE
        staff.save()
        return staff

    def _customer(self, user, **kwargs):
        customer, _ = Customer.objects.get_or_create(user=user)
        for key, value in kwargs.items():
            setattr(customer, key, value)
        customer.status = Customer.Status.ACTIVE
        customer.save()
        return customer

    def _vehicle(self, customer, **kwargs):
        plate = kwargs.pop("plate")
        vehicle, _ = Vehicle.objects.get_or_create(plate=plate, defaults={"customer": customer, "brand": kwargs["brand"], "model": kwargs["model"], "year": kwargs["year"]})
        vehicle.customer = customer
        for key, value in kwargs.items():
            setattr(vehicle, key, value)
        vehicle.save()
        return vehicle

    def _part_category(self, name):
        category, _ = SparePartCategory.objects.get_or_create(name=name)
        category.status = "ACTIVE"
        category.save()
        return category

    def _category(self, name):
        category, _ = ServiceCategory.objects.get_or_create(name=name)
        category.status = "ACTIVE"
        category.save()
        return category

    def _service(self, category, name, description, price, duration):
        service, _ = Service.objects.get_or_create(name=name, defaults={"category": category})
        service.category = category
        service.description = description
        service.price = price
        service.duration_minutes = duration
        service.status = "ACTIVE"
        service.save()
        return service

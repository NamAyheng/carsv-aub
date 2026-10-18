from datetime import date, time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

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
            photo=self._img("people/woman-portrait-blue-lighting.jpg"),
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
            photo=self._img("people/woman-office-blazer-laptop.jpg"),
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
            photo=self._img("people/man-smiling-white-vneck.jpg"),
        )
        hour = self._user(
            "hour",
            email="hour@carsv.com",
            first="Chay",
            last="Hour",
            role=User.Role.MECHANIC,
            phone="+855 96 441 220",
            position="Mechanic",
            department="Workshop",
            password="Staff123!@#",
            staff=True,
            photo=self._img("people/man-grey-sweater-studio.jpg"),
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
            photo=self._img("people/woman-smiling-hair-bun.jpg"),
        )
        ayheng_user = self._user(
            "Ayheng",
            email="namayheng12345@gmail.com",
            first="Ayheng",
            last="Nam",
            role=User.Role.CUSTOMER,
            phone="+855 10 778 221",
            password="Ayheng123!@#",
            photo=self._img("people/young-man-beard-dark-sweater.jpg"),
        )
        tharo_user = self._user(
            "Tharo",
            email="tharo@carsv.com",
            first="Tharo",
            last="Meas",
            role=User.Role.CUSTOMER,
            phone="+855 15 664 902",
            password="TharoCarSV!23",
            photo=self._img("people/young-man-smiling-outdoor-jacket.jpg"),
        )

        ayheng = self._customer(
            ayheng_user,
            name="Ayheng Nam",
            gender=Customer.Gender.MALE,
            phone="+855 10 778 221",
            email="namayheng12345@gmail.com",
            address="No. 88, Street 310, Sangkat Boeung Keng Kang I, Khan Chamkarmon, Phnom Penh",
            photo=self._img("people/young-man-beard-dark-sweater.jpg"),
        )
        tharo = self._customer(
            tharo_user,
            name="Tharo Meas",
            gender=Customer.Gender.MALE,
            phone="+855 15 664 902",
            email="tharo@carsv.com",
            address="House 12, Street 598, Sangkat Boeung Kak II, Khan Toul Kork, Phnom Penh",
            photo=self._img("people/young-man-smiling-outdoor-jacket.jpg"),
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
        inspect_service = self._service(
            maintenance,
            "General inspection",
            "Full vehicle health check.",
            Decimal("25.00"),
            60,
        )

        admin_staff = self._staff(admin_user, department="Office", position="Administrator")
        sokha_staff = self._staff(sokha, department="Reception", position="Front desk")
        dara_staff = self._staff(dara, department="Workshop", position="Senior mechanic")
        self._staff(hour, department="Workshop", position="Mechanic")
        lin_staff = self._staff(lin, department="Finance", position="Cashier")

        mechanic, _ = Mechanic.objects.get_or_create(user=dara)
        mechanic.skills = "Brakes, engine, electrics"
        mechanic.specialization = "Brake systems"
        mechanic.available = True
        mechanic.status = Mechanic.Status.ACTIVE
        mechanic.save()

        hour_mech, _ = Mechanic.objects.get_or_create(user=hour)
        hour_mech.skills = "Oil, filters, routine service"
        hour_mech.specialization = "Maintenance"
        hour_mech.available = True
        hour_mech.status = Mechanic.Status.ACTIVE
        hour_mech.save()

        part_brake = self._part_category("Brake")
        part_engine = self._part_category("Engine")
        part_filter = self._part_category("Filters")
        part_elec = self._part_category("Electrical")
        part_tires = self._part_category("Tires")
        part_ac = self._part_category("AC")
        part_trans = self._part_category("Transmission")
        part_maint = self._part_category("Maintenance")

        img = self._img
        pads = self._spare(
            "BRK-PAD-F01",
            "Front brake pads",
            part_brake,
            brand="Brembo",
            image=img("inventory/part-ceramic-brake-pads.jpg"),
            unit_price=Decimal("42.00"),
            quantity=18,
            min_stock=4,
        )
        oil_filter = self._spare(
            "ENG-OIL-H01",
            "Honda oil filter",
            part_engine,
            brand="Honda",
            image=img("inventory/part-engine-oil-filter.jpg"),
            unit_price=Decimal("8.50"),
            quantity=24,
            min_stock=5,
        )
        self._spare(
            "BRK-ROT-S01",
            "Slotted brake rotor",
            part_brake,
            brand="Brembo",
            image=img("inventory/part-slotted-brake-rotor.jpg"),
            unit_price=Decimal("95.00"),
            quantity=6,
            min_stock=2,
        )
        self._spare(
            "OIL-SYN-5W30",
            "Synthetic motor oil 5W-30",
            part_engine,
            brand="Castrol",
            image=img("inventory/part-synthetic-motor-oil.jpg"),
            unit_price=Decimal("48.00"),
            quantity=30,
            min_stock=8,
        )
        self._spare(
            "BAT-AGM-70",
            "AGM car battery 70Ah",
            part_elec,
            brand="Bosch",
            image=img("inventory/part-car-battery-agm.jpg"),
            unit_price=Decimal("145.00"),
            quantity=7,
            min_stock=2,
        )
        self._spare(
            "SPK-IR-SET",
            "Iridium spark plugs set",
            part_engine,
            brand="NGK",
            image=img("inventory/part-spark-plugs-set.jpg"),
            unit_price=Decimal("36.00"),
            quantity=20,
            min_stock=5,
        )
        self._spare(
            "FLT-CABIN-01",
            "Cabin air filter",
            part_filter,
            brand="Mann",
            image=img("inventory/part-cabin-air-filter.jpg"),
            unit_price=Decimal("18.00"),
            quantity=15,
            min_stock=4,
        )
        self._spare(
            "TIR-PERF-18",
            "Performance tire 18\"",
            part_tires,
            brand="Michelin",
            image=img("inventory/part-performance-tire.jpg"),
            unit_price=Decimal("210.00"),
            quantity=8,
            min_stock=4,
        )
        self._spare(
            "WPR-SET-22",
            "Wiper blades set",
            part_maint,
            brand="Bosch",
            image=img("inventory/part-wiper-blades-set.jpg"),
            unit_price=Decimal("22.00"),
            quantity=16,
            min_stock=4,
        )
        # Catalog reference stock (service-category visuals)
        for sku, name, category, image_path, price, qty in (
            ("CAT-BRK-01", "Brake disc assembly (catalog)", part_brake, "inventory/catalog/brakes-01-disc-rotor-caliper.jpg", "120.00", 3),
            ("CAT-BRK-02", "Brembo caliper assembly", part_brake, "inventory/catalog/brakes-02-brembo-caliper-assembly.jpg", "380.00", 2),
            ("CAT-BRK-05", "Audi ceramic rotor", part_brake, "inventory/catalog/brakes-05-audi-ceramic-rotor.jpg", "520.00", 1),
            ("CAT-AC-05", "AC recharge service kit", part_ac, "inventory/catalog/ac-05-ac-recharge-machine-shop.jpg", "75.00", 5),
            ("CAT-ENG-02", "Engine bay service pack", part_engine, "inventory/catalog/engine-02-engine-bay-detail.jpg", "55.00", 4),
            ("CAT-ENG-05", "Remanufactured engine core", part_engine, "inventory/catalog/engine-05-engine-on-chain-hoist.jpg", "1800.00", 1),
            ("CAT-TIR-03", "Warehouse tire stock", part_tires, "inventory/catalog/tires-03-tread-closeup-warehouse.jpg", "95.00", 12),
            ("CAT-TRN-02", "Transmission gear set", part_trans, "inventory/catalog/transmission-02-gears-timing-chain-hands.jpg", "640.00", 2),
            ("CAT-TRN-04", "Gearbox shaft assembly", part_trans, "inventory/catalog/transmission-04-holding-gear-shaft.jpg", "420.00", 2),
            ("CAT-MNT-01", "Workshop tool kit", part_maint, "inventory/catalog/maintenance-01-mechanic-wrenches.jpg", "40.00", 10),
        ):
            self._spare(
                sku,
                name,
                category,
                brand="CarSV",
                image=img(image_path),
                unit_price=Decimal(price),
                quantity=qty,
                min_stock=1,
            )
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

        oil_booking, _ = Booking.objects.get_or_create(
            customer=tharo,
            vehicle=ranger,
            booking_date=date(2026, 9, 20),
            defaults={"service": oil_service},
        )
        oil_booking.service = oil_service
        oil_booking.booking_time = time(14, 0)
        oil_booking.problem = "Oil warning light on."
        oil_booking.note = "Customer approved filter + oil package."
        oil_booking.status = Booking.Status.COMPLETED
        oil_booking.save()

        inspect_booking, _ = Booking.objects.get_or_create(
            customer=ayheng,
            vehicle=civic,
            booking_date=date(2026, 9, 24),
            defaults={"service": inspect_service},
        )
        inspect_booking.service = inspect_service
        inspect_booking.booking_time = time(10, 0)
        inspect_booking.problem = "Annual safety check before long trip."
        inspect_booking.note = "No parts expected unless issues found."
        inspect_booking.status = Booking.Status.COMPLETED
        inspect_booking.save()

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
        inspection, _ = Inspection.objects.get_or_create(repair_job=job)
        inspection.mileage = 42800
        inspection.fuel_level = "75"
        inspection.status = Inspection.Status.COMPLETED
        inspection.front_brake_mm = Decimal("2.5")
        inspection.rear_brake_mm = Decimal("6.8")
        inspection.tire_tread_mm = Decimal("5.2")
        inspection.condition = "Good body, noisy front brakes."
        inspection.damage = "Small scratch on rear bumper."
        inspection.note = "Checked in at reception."
        inspection.staff = sokha_staff
        inspection.save()


        oil_job, _ = RepairJob.objects.get_or_create(
            booking=oil_booking,
            defaults={"customer": tharo, "vehicle": ranger},
        )
        oil_job.customer = tharo
        oil_job.vehicle = ranger
        oil_job.mechanic = hour_mech
        oil_job.diagnosis = "Oil overdue. Filter clogged. Replaced oil and filter."
        oil_job.start_date = date(2026, 9, 20)
        oil_job.estimated_end = date(2026, 9, 20)
        oil_job.status = RepairJob.Status.COMPLETED
        oil_job.progress = 100
        oil_job.save()

        inspect_job, _ = RepairJob.objects.get_or_create(
            booking=inspect_booking,
            defaults={"customer": ayheng, "vehicle": civic},
        )
        inspect_job.customer = ayheng
        inspect_job.vehicle = civic
        inspect_job.mechanic = mechanic
        inspect_job.diagnosis = "No critical issues. Fluids and tires within range."
        inspect_job.start_date = date(2026, 9, 24)
        inspect_job.estimated_end = date(2026, 9, 24)
        inspect_job.status = RepairJob.Status.READY_FOR_PICKUP
        inspect_job.progress = 90
        inspect_job.save()

        usage, _ = PartsUsage.objects.get_or_create(
            repair_job=job,
            spare_part=pads,
            defaults={"quantity": 1, "unit_price": pads.unit_price},
        )
        usage.quantity = 1
        usage.unit_price = pads.unit_price
        usage.recorded_by = dara_staff
        usage.save()

        oil_usage, _ = PartsUsage.objects.get_or_create(
            repair_job=oil_job,
            spare_part=oil_filter,
            defaults={"quantity": 1, "unit_price": oil_filter.unit_price},
        )
        oil_usage.quantity = 1
        oil_usage.unit_price = oil_filter.unit_price
        oil_usage.recorded_by = dara_staff
        oil_usage.save()

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

        oil_invoice, _ = Invoice.objects.get_or_create(
            number="INV-2026-0002",
            defaults={
                "customer": tharo,
                "vehicle": ranger,
                "repair_job": oil_job,
            },
        )
        oil_invoice.customer = tharo
        oil_invoice.vehicle = ranger
        oil_invoice.repair_job = oil_job
        oil_invoice.labor_cost = Decimal("20.00")
        oil_invoice.service_cost = Decimal("35.00")
        oil_invoice.parts_cost = Decimal("8.50")
        oil_invoice.discount = Decimal("0.00")
        oil_invoice.tax = Decimal("3.18")
        oil_invoice.status = Invoice.Status.PARTIAL
        oil_invoice.save()

        inspect_invoice, _ = Invoice.objects.get_or_create(
            number="INV-2026-0003",
            defaults={
                "customer": ayheng,
                "vehicle": civic,
                "repair_job": inspect_job,
            },
        )
        inspect_invoice.customer = ayheng
        inspect_invoice.vehicle = civic
        inspect_invoice.repair_job = inspect_job
        inspect_invoice.labor_cost = Decimal("15.00")
        inspect_invoice.service_cost = Decimal("25.00")
        inspect_invoice.parts_cost = Decimal("0.00")
        inspect_invoice.discount = Decimal("0.00")
        inspect_invoice.tax = Decimal("2.00")
        inspect_invoice.status = Invoice.Status.UNPAID
        inspect_invoice.save()

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
        payment.verified_at = timezone.now()
        payment.save()

        oil_payment, _ = Payment.objects.get_or_create(
            number="PAY-2026-0002",
            defaults={
                "invoice": oil_invoice,
                "customer": tharo,
                "amount": Decimal("30.00"),
                "paid_at": date(2026, 9, 20),
            },
        )
        oil_payment.invoice = oil_invoice
        oil_payment.customer = tharo
        oil_payment.amount = Decimal("30.00")
        oil_payment.method = Payment.Method.QR
        oil_payment.paid_at = date(2026, 9, 20)
        oil_payment.reference = "QR-0920"
        oil_payment.received_by = lin_staff
        oil_payment.status = Payment.Status.PAID
        oil_payment.receipt_number = "RCT-2026-0002"
        oil_payment.verified_at = timezone.now()
        oil_payment.save()

        self.stdout.write(self.style.SUCCESS("Sample data loaded for all garage tables"))

    @staticmethod
    def _img(relative_path: str) -> str:
        """Relative path under static images library (copied into MEDIA on attach)."""
        return relative_path.lstrip("/")

    def _attach_image(self, instance, field_name, relative_path):
        """Copy a packaged static image into MEDIA_ROOT and assign the ImageField."""
        if not relative_path:
            return
        from pathlib import Path

        from django.conf import settings
        from django.core.files import File

        src = Path(settings.BASE_DIR) / "django_app" / "static" / "django_app" / "images" / relative_path
        if not src.exists():
            return
        field = getattr(instance, field_name)
        if field and getattr(field, "name", ""):
            return
        with src.open("rb") as handle:
            field.save(src.name, File(handle), save=False)

    def _spare(self, part_number, name, category, **kwargs):
        part, _ = SparePart.objects.get_or_create(
            part_number=part_number,
            defaults={"name": name, "category": category},
        )
        part.name = name
        part.category = category
        part.brand = kwargs.get("brand", "")
        part.unit_price = kwargs.get("unit_price", Decimal("0"))
        part.quantity = kwargs.get("quantity", 0)
        part.min_stock = kwargs.get("min_stock", 0)
        part.status = SparePart.Status.ACTIVE
        self._attach_image(part, "image", kwargs.get("image", ""))
        part.save()
        return part

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
        user.email_verified = True
        user.email_is_placeholder = False
        user.set_password(kwargs["password"])
        self._attach_image(user, "photo", kwargs.get("photo", ""))
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
        photo = kwargs.pop("photo", "")
        customer, _ = Customer.objects.get_or_create(user=user)
        for key, value in kwargs.items():
            setattr(customer, key, value)
        customer.status = Customer.Status.ACTIVE
        self._attach_image(customer, "photo", photo)
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

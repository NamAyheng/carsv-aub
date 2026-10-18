"""Fill the development database with linked garage records.

Safe to run more than once. Existing rows are left in place, including the
administrator login and the current customer accounts.
"""

import secrets
import shutil
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from django_app.models import (
    BlogPost,
    Booking,
    Customer,
    Estimate,
    Inspection,
    Invoice,
    Mechanic,
    Notification,
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
)

MARKER = "sample-garage"
PROTECTED_USERNAMES = {"administrator", "Ayheng", "NamAyheng", "Tharo"}
PROTECTED_EMAILS = {"namayheng12345@gmail.com", "admin@carsv.com"}


def money(value):
    return Decimal(value).quantize(Decimal("0.01"))


def aware(day, hour=16, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


class Command(BaseCommand):
    help = "Add linked sample garage records to the development database."

    def handle(self, *args, **options):
        self._guard_database()
        backup = self._backup()
        admin_hash = User.objects.get(username="administrator").password
        ayheng = User.objects.get(email="namayheng12345@gmail.com")
        ayheng_hash = ayheng.password
        before = self._counts()

        with transaction.atomic():
            self._services()
            self._parts()
            self._staff()
            customers = self._customers()
            self._bookings(customers)
            self._blog()
            self._check_money()

        admin_now = User.objects.get(username="administrator")
        ayheng_now = User.objects.get(email="namayheng12345@gmail.com")
        if admin_now.password != admin_hash or admin_now.username != "administrator":
            raise CommandError("The administrator login was changed. The backup is unchanged.")
        if ayheng_now.password != ayheng_hash or ayheng_now.email != "namayheng12345@gmail.com":
            raise CommandError("The existing customer login was changed.")

        after = self._counts()
        self.stdout.write(self.style.SUCCESS(f"Backup: {backup}"))
        self.stdout.write("Records now in the development database:")
        for label, total in after.items():
            added = total - before[label]
            self.stdout.write(f"  {label}: {total} ({added} new)")
        self.stdout.write("Not created, because the database has no model for them:")
        self.stdout.write("  suppliers, purchase orders, stock movements, reviews, documents, offers")

    def _guard_database(self):
        engine = settings.DATABASES["default"]["ENGINE"]
        if engine != "django.db.backends.sqlite3":
            raise CommandError("This command only runs against the local SQLite development database.")
        name = str(settings.DATABASES["default"]["NAME"])
        if "prod" in name.lower():
            raise CommandError("Refusing to write to a database path that looks like production.")

    def _backup(self):
        source = Path(settings.DATABASES["default"]["NAME"])
        dest = source.with_name(source.name + ".bak-before-populate")
        if not dest.exists():
            shutil.copy2(source, dest)
        return dest

    def _counts(self):
        return {
            "users": User.objects.count(),
            "customers": Customer.objects.count(),
            "vehicles": Vehicle.objects.count(),
            "services": Service.objects.count(),
            "parts": SparePart.objects.count(),
            "bookings": Booking.objects.count(),
            "inspections": Inspection.objects.count(),
            "work_orders": RepairJob.objects.count(),
            "parts_used": PartsUsage.objects.count(),
            "estimates": Estimate.objects.count(),
            "invoices": Invoice.objects.count(),
            "payments": Payment.objects.count(),
            "notifications": Notification.objects.count(),
            "blog_posts": BlogPost.objects.count(),
            "staff": Staff.objects.count(),
            "mechanics": Mechanic.objects.count(),
        }

    def _media(self, relative):
        path = Path(settings.MEDIA_ROOT) / relative
        if not path.is_file():
            raise CommandError(f"Missing image file: {relative}")
        return relative

    def _user(self, *, username, email, first, last, role, phone, photo=""):
        if username in PROTECTED_USERNAMES or email in PROTECTED_EMAILS:
            raise CommandError(f"Refusing to create or edit protected account {username}.")
        if not email.endswith("@gmail.com"):
            raise CommandError(f"New accounts must use gmail.com: {email}")
        user = User.objects.filter(email=email).first()
        if user:
            return user
        if User.objects.filter(username=username).exists():
            raise CommandError(f"Username already exists: {username}")
        user = User(
            username=username,
            email=email,
            first_name=first,
            last_name=last,
            role=role,
            phone=phone,
            status=User.Status.ACTIVE,
            email_verified=True,
        )
        user.set_password(secrets.token_urlsafe(18))
        user.save()
        if photo:
            relative = self._media(photo)
            User.objects.filter(pk=user.pk, photo="").update(photo=relative)
            Customer.objects.filter(user=user, photo="").update(photo=relative)
            user.refresh_from_db()
        return user

    def _services(self):
        categories = {
            name: ServiceCategory.objects.get_or_create(name=name, defaults={"status": "ACTIVE"})[0]
            for name in ("Brake", "Engine", "Maintenance", "Tires", "AC", "Electrical", "Transmission")
        }
        rows = [
            ("Wheel alignment", "Tires", "45.00", 60, "services/service-wheel-alignment.jpg", "Camber, caster, and toe adjustment on the alignment rack."),
            ("AC recharge", "AC", "70.00", 75, "services/service-ac-charge.jpg", "Recover, vacuum, and recharge the air-conditioning system."),
            ("Brake fluid flush", "Brake", "40.00", 50, "products/brakes-03-rotor-caliper-on-lift.jpg", "Replace old brake fluid and bleed the system."),
            ("Spark plug replacement", "Engine", "55.00", 60, "parts/part-spark-plugs-set.jpg", "Replace the spark plug set and check the coils."),
            ("Cabin filter replacement", "Maintenance", "20.00", 30, "parts/part-cabin-air-filter.jpg", "Replace the cabin air filter."),
            ("Battery replacement", "Electrical", "95.00", 40, "parts/part-car-battery-agm.jpg", "Test the charging system and fit a replacement battery when it has failed."),
            ("Transmission service", "Transmission", "120.00", 90, "products/transmission-01-socket-wrench-engine.jpg", "Drain and fill automatic transmission fluid and replace the filter when the pan is dropped."),
            ("Coolant flush", "Engine", "48.00", 50, "products/engine-01-socket-wrench-work.jpg", "Drain the cooling system and refill with the correct coolant."),
        ]
        for name, category, price, minutes, image, description in rows:
            service, created = Service.objects.get_or_create(
                name=name,
                defaults={
                    "category": categories[category],
                    "description": description,
                    "price": money(price),
                    "duration_minutes": minutes,
                    "status": "ACTIVE",
                },
            )
            if created or not service.image:
                Service.objects.filter(pk=service.pk, image="").update(image=self._media(image))

    def _parts(self):
        categories = {
            name: SparePartCategory.objects.get_or_create(name=name, defaults={"status": "ACTIVE"})[0]
            for name in ("Brake", "Engine", "Electrical", "Maintenance", "Tires", "Transmission", "AC", "Filters")
        }
        rows = [
            ("BRK-FLD-01", "Brake fluid DOT 4", "Brake", "Bosch", "12.00", 24, 6, "products/brakes-04-large-brake-assembly.jpg"),
            ("CLT-GRN-01", "Green coolant 5L", "Engine", "Toyota", "18.00", 16, 4, "products/engine-03-tablet-inspection-battery.jpg"),
            ("ALT-120-01", "Alternator 120A", "Electrical", "Denso", "145.00", 4, 1, "products/ac-04-gauges-over-engine-battery.jpg"),
            ("WPR-ARM-01", "Wiper arm pair", "Maintenance", "Bosch", "22.00", 10, 2, "products/maintenance-05-socket-wrench-hands.jpg"),
            ("TIR-195-01", "Tire 195/65R15", "Tires", "Michelin", "89.00", 12, 4, "products/tires-02-mechanic-holding-tire.jpg"),
            ("TRN-FLT-01", "Transmission filter kit", "Transmission", "Aisin", "36.00", 8, 2, "products/transmission-03-bench-screwdriver-repair.jpg"),
            ("AC-COMP-01", "AC compressor", "AC", "Denso", "280.00", 2, 1, "products/ac-01-dashboard-vent-gauge-check.jpg"),
            ("ENG-BELT-01", "Serpentine belt", "Engine", "Gates", "28.00", 9, 2, "products/engine-04-wrenches-on-engine.jpg"),
            ("BRK-SHOE-01", "Rear brake shoes", "Brake", "Bendix", "42.00", 7, 2, "products/maintenance-02-mechanic-under-lift-brakes.jpg"),
            ("OIL-0W20-01", "Motor oil 0W-20", "Engine", "Mobil", "32.00", 20, 6, "blog/oil-change-pouring-mobil1.jpg"),
            ("TIR-LUG-01", "Locking lug nut set", "Tires", "McGard", "24.00", 15, 3, "products/tires-01-impact-wrench-lug-nuts.jpg"),
            ("CAB-FLT-02", "Activated cabin filter", "Filters", "Mann", "14.00", 18, 4, "products/ac-03-holding-manifold-gauge-set.jpg"),
            ("SPK-COIL-01", "Ignition coil", "Engine", "NGK", "38.00", 6, 2, "products/maintenance-03-mechanic-wrench-engine.jpg"),
            ("RAD-HOSE-01", "Radiator hose set", "Engine", "Gates", "26.00", 5, 2, "products/ac-02-engine-bay-manifold-gauges.jpg"),
            ("TRN-OIL-01", "Automatic transmission fluid 4L", "Transmission", "Honda", "34.00", 11, 3, "products/transmission-05-tablet-engine-inspection.jpg"),
        ]
        for number, name, category, brand, price, qty, minimum, image in rows:
            part, created = SparePart.objects.get_or_create(
                part_number=number,
                defaults={
                    "name": name,
                    "category": categories[category],
                    "brand": brand,
                    "unit_price": money(price),
                    "quantity": qty,
                    "min_stock": minimum,
                    "status": SparePart.Status.ACTIVE,
                },
            )
            if created or not part.image:
                SparePart.objects.filter(pk=part.pk, image="").update(image=self._media(image))

    def _staff(self):
        people = [
            ("sophea.yim", "sophea.yim@gmail.com", "Sophea", "Yim", User.Role.RECEPTIONIST, "+855 12 640 118", "staff/woman-striped-shirt-outdoor.jpg", "", ""),
            ("nara.tun", "nara.tun@gmail.com", "Nara", "Tun", User.Role.MECHANIC, "+855 17 552 640", "staff/young-man-mandarin-collar.jpg", "Electrical, batteries, starting systems", "Auto electrician"),
            ("vicheka.mao", "vicheka.mao@gmail.com", "Vicheka", "Mao", User.Role.MECHANIC, "+855 69 220 418", "staff/young-man-smiling-outdoor-jacket.jpg", "Transmission, clutch, drivetrain", "Drivetrain"),
        ]
        for username, email, first, last, role, phone, photo, skills, specialization in people:
            user = self._user(username=username, email=email, first=first, last=last, role=role, phone=phone, photo=photo)
            if role == User.Role.MECHANIC:
                mechanic = Mechanic.objects.get(user=user)
                if not mechanic.skills:
                    mechanic.skills = skills
                    mechanic.specialization = specialization
                    mechanic.available = True
                    mechanic.save()

    def _customers(self):
        rows = [
            ("vannak.keo", "vannak.keo@gmail.com", "Vannak", "Keo", Customer.Gender.MALE, "+855 12 771 204", "staff/man-profile-curly-beard-bw.jpg", "No. 14, St. 271, Sangkat Chak Angre Leu, Khan Meanchey, Phnom Penh", [("2LP-5537", "Toyota", "Camry", 2020, "Silver", "Sedan", 61200), ("2BB-5867", "Honda", "CR-V", 2022, "White", "SUV", 28400)]),
            ("sreymom.phan", "sreymom.phan@gmail.com", "Sreymom", "Phan", Customer.Gender.FEMALE, "+855 15 883 019", "", "House 6, St. 360, Sangkat Boeung Keng Kang III, Khan Chamkarmon, Phnom Penh", [("2BW-0239", "Mazda", "CX-5", 2021, "Red", "SUV", 40300)]),
            ("piseth.ros", "piseth.ros@gmail.com", "Piseth", "Ros", Customer.Gender.MALE, "+855 10 226 774", "staff/young-man-beard-dark-sweater.jpg", "No. 90, St. 598, Sangkat Boeung Kak II, Khan Toul Kork, Phnom Penh", [("2GV-9910", "Ford", "Ranger", 2018, "Blue", "Pickup", 97200), ("2P-0431", "Hyundai", "Tucson", 2023, "Grey", "SUV", 15600)]),
            ("kunthea.sok", "kunthea.sok@gmail.com", "Kunthea", "Sok", Customer.Gender.FEMALE, "+855 16 449 330", "", "No. 22, St. 155, Sangkat Phsar Thmei III, Khan Daun Penh, Phnom Penh", [("2H-3965", "Kia", "Morning", 2019, "Yellow", "Hatchback", 54800), ("2G-6074", "Toyota", "Vios", 2017, "White", "Sedan", 110400)]),
            ("rithy.chan", "rithy.chan@gmail.com", "Rithy", "Chan", Customer.Gender.MALE, "+855 11 908 221", "", "No. 3, St. 430, Sangkat Toul Tompoung I, Khan Chamkarmon, Phnom Penh", [("2TJ-0264", "Mitsubishi", "Triton", 2020, "Black", "Pickup", 73600)]),
            ("bopha.lim", "bopha.lim@gmail.com", "Bopha", "Lim", Customer.Gender.FEMALE, "+855 92 118 640", "", "House 18, St. 2004, Sangkat Kakab, Khan Pou Senchey, Phnom Penh", [("2I-6846", "Toyota", "Hilux", 2021, "White", "Pickup", 82100), ("2YX-3306", "Nissan", "Navara", 2016, "Grey", "Pickup", 134200)]),
            ("vibol.seng", "vibol.seng@gmail.com", "Vibol", "Seng", Customer.Gender.MALE, "+855 70 334 908", "", "No. 41, St. 63, Sangkat Boeung Keng Kang I, Khan Chamkarmon, Phnom Penh", [("2HL-8339", "BMW", "320i", 2018, "Black", "Sedan", 68900)]),
            ("chenda.nop", "chenda.nop@gmail.com", "Chenda", "Nop", Customer.Gender.FEMALE, "+855 81 220 116", "", "No. 9, St. 51, Sangkat Boeung Keng Kang I, Khan Chamkarmon, Phnom Penh", [("2W-2663", "Lexus", "RX", 2022, "Pearl", "SUV", 22100)]),
            ("makara.yun", "makara.yun@gmail.com", "Makara", "Yun", Customer.Gender.MALE, "+855 88 641 775", "", "No. 77, St. 128, Sangkat Phsar Depo I, Khan Toul Kork, Phnom Penh", [("2CP-5603", "Honda", "City", 2020, "Blue", "Sedan", 46700)]),
            ("sopheak.thy", "sopheak.thy@gmail.com", "Sopheak", "Thy", Customer.Gender.MALE, "+855 96 102 883", "", "House 2, St. 371, Sangkat Toul Svay Prey I, Khan Boeung Keng Kang, Phnom Penh", [("2LJ-5247", "Audi", "A4", 2019, "Grey", "Sedan", 71200), ("2HZ-3585", "Toyota", "Prius", 2021, "White", "Hatchback", 33800)]),
            ("lina.chea", "lina.chea@gmail.com", "Lina", "Chea", Customer.Gender.FEMALE, "+855 12 990 441", "", "No. 55, St. 271, Sangkat Steung Meanchey, Khan Meanchey, Phnom Penh", [("2D-8854", "Suzuki", "Swift", 2018, "Red", "Hatchback", 60300), ("2A-8210", "Honda", "Accord", 2015, "Black", "Sedan", 141800)]),
            ("pheaktra.orn", "pheaktra.orn@gmail.com", "Pheaktra", "Orn", Customer.Gender.MALE, "+855 15 773 260", "", "No. 12, National Road 2, Sangkat Chak Angre Krom, Khan Meanchey, Phnom Penh", [("2M-2936", "Ford", "Everest", 2022, "White", "SUV", 29500)]),
        ]
        found = {}
        for username, email, first, last, gender, phone, photo, address, vehicles in rows:
            user = self._user(
                username=username,
                email=email,
                first=first,
                last=last,
                role=User.Role.CUSTOMER,
                phone=phone,
                photo=photo,
            )
            customer = Customer.objects.get(user=user)
            if not customer.address:
                customer.gender = gender
                customer.address = address
                customer.notes = "Sample garage account for workshop lists and search."
                customer.save()
            for plate, brand, model, year, color, vehicle_type, mileage in vehicles:
                Vehicle.objects.get_or_create(
                    plate=plate,
                    defaults={
                        "customer": customer,
                        "brand": brand,
                        "model": model,
                        "year": year,
                        "color": color,
                        "vehicle_type": vehicle_type,
                        "vin": f"KHVIN{plate[-4:]}0000000",
                        "engine_number": f"ENG-{plate[-4:]}",
                        "mileage": mileage,
                        "status": Vehicle.Status.ACTIVE,
                        "next_service_date": date(2026, 12, 15),
                        "next_service_mileage": mileage + 5000,
                        "notes": f"{MARKER}: vehicle",
                    },
                )
            found[email] = customer
        return found

    def _bookings(self, customers):
        receptionist = Staff.objects.get(user__username="sokha")
        cashier = Staff.objects.get(user__username="lin")
        specs = [
            self._visit("BK-01", "2LP-5537", "Oil change", date(2026, 10, 22), time(9, 0), Booking.Status.PENDING, "Oil change before a trip to Sihanoukville."),
            self._visit("BK-02", "2BW-0239", "General inspection", date(2026, 10, 24), time(10, 30), Booking.Status.PENDING, "Rattle from the front suspension on rough roads."),
            self._visit("BK-03", "2H-3965", "Cabin filter replacement", date(2026, 10, 28), time(14, 0), Booking.Status.CONFIRMED, "Musty smell from the vents."),
            self._visit("BK-04", "2TJ-0264", "Wheel alignment", date(2026, 11, 3), time(8, 30), Booking.Status.CONFIRMED, "Steering wheel sits off center after a curb hit."),
            self._visit("BK-05", "2CP-5603", "AC recharge", date(2026, 9, 18), time(11, 0), Booking.Status.CANCELLED, "AC is weak in traffic.", cancel="Customer postponed the visit."),
            self._visit("BK-06", "2D-8854", "Battery replacement", date(2026, 9, 2), time(15, 30), Booking.Status.CANCELLED, "Slow crank in the morning.", cancel="Booked twice. The earlier visit was kept."),
            self._visit("BK-07", "2BB-5867", "General inspection", date(2026, 10, 11), time(9, 0), Booking.Status.CHECKED_IN, "Inspection before a long drive.", job=RepairJob.Status.WAITING, mechanic="dara", estimate=Estimate.Status.REJECTED, labor="15.00"),
            self._visit("BK-08", "2GV-9910", "Oil change", date(2026, 10, 11), time(13, 0), Booking.Status.CHECKED_IN, "Due for oil and a filter.", job=RepairJob.Status.DIAGNOSING, mechanic="hour", estimate=Estimate.Status.SENT, labor="20.00"),
            self._visit("BK-09", "2P-0431", "Brake fluid flush", date(2026, 10, 10), time(9, 30), Booking.Status.IN_SERVICE, "Brake pedal feels soft.", job=RepairJob.Status.WAITING_APPROVAL, mechanic="nara.tun", estimate=Estimate.Status.SENT, labor="25.00"),
            self._visit("BK-10", "2G-6074", "Spark plug replacement", date(2026, 10, 9), time(10, 0), Booking.Status.IN_SERVICE, "Misfire when pulling away.", job=RepairJob.Status.REPAIRING, mechanic="vicheka.mao", estimate=Estimate.Status.APPROVED, parts=[("SPK-IR-SET", 1)], invoice=Invoice.Status.DRAFT, labor="30.00"),
            self._visit("BK-11", "2I-6846", "Transmission service", date(2026, 10, 8), time(8, 30), Booking.Status.IN_SERVICE, "Delayed engagement from park into drive.", job=RepairJob.Status.REPAIRING, mechanic="dara", estimate=Estimate.Status.APPROVED, parts=[("TRN-FLT-01", 1), ("TRN-OIL-01", 1)], invoice=Invoice.Status.UNPAID, labor="45.00"),
            self._visit("BK-12", "2HL-8339", "Coolant flush", date(2026, 10, 7), time(14, 30), Booking.Status.IN_SERVICE, "Temperature climbs in traffic.", job=RepairJob.Status.QUALITY_CHECK, mechanic="hour", estimate=Estimate.Status.APPROVED, parts=[("CLT-GRN-01", 1)], invoice=Invoice.Status.UNPAID, labor="25.00"),
            self._visit("BK-13", "2W-2663", "Wheel alignment", date(2026, 10, 6), time(9, 0), Booking.Status.IN_SERVICE, "Car pulls to the right.", job=RepairJob.Status.QUALITY_CHECK, mechanic="nara.tun", invoice=Invoice.Status.PARTIAL, pay="half", method=Payment.Method.CARD, labor="35.00", discount="5.00"),
            self._visit("BK-14", "2LJ-5247", "Oil change", date(2026, 8, 14), time(9, 0), Booking.Status.COMPLETED, "Scheduled oil and filter service.", job=RepairJob.Status.COMPLETED, mechanic="dara", estimate=Estimate.Status.APPROVED, parts=[("OIL-0W20-01", 1), ("ENG-OIL-H01", 1)], invoice=Invoice.Status.PAID, pay="full", method=Payment.Method.CASH, labor="15.00"),
            self._visit("BK-15", "2HZ-3585", "General inspection", date(2026, 8, 21), time(11, 0), Booking.Status.COMPLETED, "Pre-trip health check.", job=RepairJob.Status.COMPLETED, mechanic="hour", invoice=Invoice.Status.PAID, pay="full", method=Payment.Method.BANK, labor="10.00"),
            self._visit("BK-16", "2YX-3306", "Brake fluid flush", date(2026, 7, 30), time(15, 0), Booking.Status.COMPLETED, "Fluid had not been changed in three years.", job=RepairJob.Status.COMPLETED, mechanic="vicheka.mao", parts=[("BRK-FLD-01", 2)], invoice=Invoice.Status.PAID, pay="full", method=Payment.Method.QR, labor="20.00"),
            self._visit("BK-17", "2A-8210", "AC recharge", date(2026, 9, 5), time(10, 30), Booking.Status.COMPLETED, "Warm air from the center vents.", job=RepairJob.Status.COMPLETED, mechanic="nara.tun", estimate=Estimate.Status.APPROVED, parts=[("AC-COMP-01", 1)], invoice=Invoice.Status.PARTIAL, pay="half", method=Payment.Method.BANK, labor="60.00", discount="10.00"),
            self._visit("BK-18", "2M-2936", "Battery replacement", date(2026, 6, 19), time(8, 30), Booking.Status.COMPLETED, "Battery failed the load test.", job=RepairJob.Status.COMPLETED, mechanic="dara", parts=[("BAT-AGM-70", 1)], invoice=Invoice.Status.CANCELLED, labor="20.00"),
            self._visit("BK-19", "2H-3965", "Oil change", date(2026, 7, 8), time(9, 30), Booking.Status.COMPLETED, "Oil change at 50,000 km.", job=RepairJob.Status.COMPLETED, mechanic="hour", parts=[("OIL-SYN-5W30", 1), ("ENG-OIL-H01", 1)], invoice=Invoice.Status.PAID, pay="full", method=Payment.Method.CASH, labor="15.00"),
            self._visit("BK-20", "2TJ-0264", "Coolant flush", date(2026, 7, 22), time(13, 30), Booking.Status.COMPLETED, "Coolant looked rusty.", job=RepairJob.Status.COMPLETED, mechanic="vicheka.mao", parts=[("CLT-GRN-01", 1), ("RAD-HOSE-01", 1)], invoice=Invoice.Status.PAID, pay="full", method=Payment.Method.CARD, labor="30.00", discount="0.00"),
        ]
        open_plates = set()
        for spec in specs:
            self._one_booking(spec, receptionist, cashier)
            if spec["status"] in {Booking.Status.CHECKED_IN, Booking.Status.IN_SERVICE}:
                open_plates.add(spec["plate"])
        Vehicle.objects.filter(plate__in=open_plates, notes__startswith=MARKER).update(status=Vehicle.Status.IN_SHOP)
        for vehicle in Vehicle.objects.filter(notes__startswith=MARKER, next_service_date__isnull=False):
            self._notify(
                vehicle.customer,
                Notification.Kind.MAINTENANCE,
                f"Next service for {vehicle.plate}",
                f"{vehicle.brand} {vehicle.model} is due around {vehicle.next_service_date}.",
                read=False,
            )

    def _visit(self, key, plate, service, day, clock, status, problem, **extra):
        extra.update(key=key, plate=plate, service=service, day=day, clock=clock, status=status, problem=problem)
        return extra

    def _one_booking(self, spec, receptionist, cashier):
        note = f"{MARKER}:{spec['key']}"
        existing = Booking.objects.filter(note=note).first()
        if existing:
            return existing
        vehicle = Vehicle.objects.get(plate=spec["plate"])
        service = Service.objects.get(name=spec["service"])
        booking = Booking.objects.create(
            customer=vehicle.customer,
            vehicle=vehicle,
            service=service,
            booking_date=spec["day"],
            booking_time=spec["clock"],
            problem=spec["problem"],
            note=note,
            status=spec["status"],
        )
        if spec["status"] == Booking.Status.CANCELLED:
            booking.cancel_reason = spec["cancel"]
            booking.cancelled_at = aware(spec["day"], 17, 0)
            booking.cancelled_by = receptionist.user
            booking.save(update_fields=["cancel_reason", "cancelled_at", "cancelled_by"])
        self._notify(
            vehicle.customer,
            Notification.Kind.BOOKING,
            f"Booking {spec['key']} for {vehicle.plate}",
            f"{service.name} on {spec['day']} is {booking.get_status_display().lower()}.",
            read=spec["status"] in {Booking.Status.COMPLETED, Booking.Status.CANCELLED},
        )
        if "job" not in spec:
            return booking

        mechanic = Mechanic.objects.get(user__username=spec["mechanic"])
        progress = {
            RepairJob.Status.WAITING: 10,
            RepairJob.Status.DIAGNOSING: 25,
            RepairJob.Status.WAITING_APPROVAL: 40,
            RepairJob.Status.REPAIRING: 60,
            RepairJob.Status.QUALITY_CHECK: 85,
            RepairJob.Status.READY_FOR_PICKUP: 95,
            RepairJob.Status.COMPLETED: 100,
        }[spec["job"]]
        job = RepairJob.objects.create(
            booking=booking,
            customer=vehicle.customer,
            vehicle=vehicle,
            mechanic=mechanic,
            problem=spec["problem"],
            start_date=spec["day"],
            estimated_end=spec["day"] + timedelta(days=1 if spec["job"] != RepairJob.Status.COMPLETED else 0),
            status=spec["job"],
            progress=progress,
        )
        inspection, _ = Inspection.objects.get_or_create(repair_job=job)
        inspection.status = (
            Inspection.Status.CHECK_IN
            if spec["job"] == RepairJob.Status.DIAGNOSING
            else Inspection.Status.COMPLETED
        )
        inspection.mileage = vehicle.mileage
        inspection.fuel_level = "50"
        inspection.front_brake_mm = Decimal("7.5")
        inspection.rear_brake_mm = Decimal("6.0")
        inspection.tire_tread_mm = Decimal("4.5")
        inspection.condition = "Walk-around completed at check-in."
        inspection.note = note
        inspection.staff = receptionist
        inspection.save()
        parts_cost = Decimal("0.00")
        for number, quantity in spec.get("parts", []):
            part = SparePart.objects.get(part_number=number)
            if quantity > part.quantity:
                raise CommandError(f"{number} does not have enough stock for {spec['key']}.")
            usage = PartsUsage(
                repair_job=job,
                spare_part=part,
                quantity=quantity,
                unit_price=part.unit_price,
                total=part.unit_price,
                recorded_by=mechanic.user.staff_profile,
            )
            usage.save()
            parts_cost += usage.total
        labor = money(spec.get("labor", "0"))
        discount = money(spec.get("discount", "0"))
        service_cost = money(service.price)
        tax = money((labor + service_cost + parts_cost - discount) * Decimal("0.10"))
        if spec.get("estimate"):
            number = f"EST-SAMPLE-{spec['key'][-2:]}"
            status = spec["estimate"]
            Estimate.objects.get_or_create(
                number=number,
                defaults={
                    "customer": vehicle.customer,
                    "vehicle": vehicle,
                    "repair_job": job,
                    "description": f"{service.name} for {vehicle.plate}. Labor, the booked service, and listed parts.",
                    "labor_cost": labor,
                    "service_cost": service_cost,
                    "parts_cost": parts_cost,
                    "discount": discount,
                    "tax": tax,
                    "status": status,
                    "decision_note": "" if status == Estimate.Status.SENT else "Recorded at the front desk.",
                    "decided_at": None if status == Estimate.Status.SENT else aware(spec["day"], 15, 30),
                },
            )
            self._notify(
                vehicle.customer,
                Notification.Kind.QUOTE,
                f"Quotation {number}",
                f"A quotation for {vehicle.plate} is {status.lower()}.",
                read=status != Estimate.Status.SENT,
            )
        if spec.get("invoice"):
            number = f"INV-SAMPLE-{spec['key'][-2:]}"
            invoice = Invoice(
                number=number,
                customer=vehicle.customer,
                vehicle=vehicle,
                repair_job=job,
                labor_cost=labor,
                service_cost=service_cost,
                parts_cost=parts_cost,
                discount=discount,
                tax=tax,
                status=spec["invoice"],
            )
            invoice.save()
            Invoice.objects.filter(pk=invoice.pk).update(invoice_date=spec["day"])
            invoice.refresh_from_db()
            self._notify(
                vehicle.customer,
                Notification.Kind.INVOICE,
                f"Invoice {number}",
                f"Invoice {number} for {vehicle.plate} is {invoice.get_status_display().lower()}.",
                read=invoice.status in {Invoice.Status.PAID, Invoice.Status.CANCELLED},
            )
            pay = spec.get("pay")
            if pay:
                amount = invoice.grand_total if pay == "full" else money(invoice.grand_total / 2)
                payment = Payment.objects.create(
                    number=f"PAY-SAMPLE-{spec['key'][-2:]}",
                    invoice=invoice,
                    customer=vehicle.customer,
                    amount=amount,
                    method=spec["method"],
                    paid_at=spec["day"],
                    reference=f"front-desk-{spec['key'].lower()}",
                    received_by=cashier,
                    status=Payment.Status.PAID,
                    receipt_number=f"RCP-SAMPLE-{spec['key'][-2:]}",
                    verified_at=timezone.now(),
                )
                self._notify(
                    vehicle.customer,
                    Notification.Kind.PAYMENT,
                    f"Receipt {payment.receipt_number}",
                    f"A {payment.get_method_display().lower()} payment of ${amount} was recorded for {number}.",
                    read=True,
                )
        return booking

    def _notify(self, customer, kind, title, message, read):
        Notification.objects.get_or_create(
            customer=customer,
            title=title,
            defaults={"kind": kind, "message": message, "read": read},
        )

    def _blog(self):
        posts = [
            (
                "wheel-alignment-at-carsv",
                "What a wheel alignment includes",
                "Tires",
                "The alignment rack measures camber, caster, and toe. The starting price is the wheel-alignment service on the catalog.",
                "A pull to one side or a steering wheel that sits off center is a reason to book the alignment, not only new tires.\n\nThe catalog price is the starting price for the adjustment. A bent arm or worn joint is extra work and is quoted before it is done.",
                "Mention which way the car pulls.\nBring the car after any new tires are fitted.",
                "services/service-wheel-alignment.jpg",
                True,
                date(2026, 9, 12),
            ),
            (
                "brake-fluid-flush",
                "When the brake fluid is due",
                "Brakes",
                "Brake fluid absorbs moisture. A flush is its own bookable service, separate from pad replacement.",
                "Dark fluid or a soft pedal is a reason to book the brake fluid flush. The workshop bleeds the system and replaces the fluid listed on the job.\n\nPad replacement stays a different service. If the pads are worn as well, that is quoted on its own.",
                "Say if the pedal sinks while you are stopped.\nKeep the invoice so the next flush date is known.",
                "products/brakes-04-large-brake-assembly.jpg",
                True,
                date(2026, 8, 28),
            ),
            (
                "ac-before-the-hot-months",
                "AC check before the hot months",
                "AC",
                "Draft notes for an air-conditioning article. Not on the public site yet.",
                "This draft is stored so the workshop can finish it. It is not published.",
                "Confirm the catalog price before publishing.",
                "services/service-ac-charge.jpg",
                False,
                None,
            ),
        ]
        for slug, title, category, excerpt, body, tips, image, published, published_at in posts:
            post, created = BlogPost.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "category": category,
                    "excerpt": excerpt,
                    "body": body,
                    "tips": tips,
                    "author_name": "CarSV Workshop",
                    "featured": False,
                    "read_minutes": 3,
                    "published": published,
                    "published_at": published_at,
                },
            )
            if created or not post.image:
                BlogPost.objects.filter(pk=post.pk, image="").update(image=self._media(image))

    def _check_money(self):
        for invoice in Invoice.objects.filter(number__startswith="INV-SAMPLE-"):
            expected_sub = money(invoice.labor_cost + invoice.service_cost + invoice.parts_cost)
            expected_grand = money(expected_sub - invoice.discount + invoice.tax)
            if invoice.subtotal != expected_sub or invoice.grand_total != expected_grand:
                raise CommandError(f"{invoice.number} totals do not match the labor, service, parts, discount, and tax.")
            paid = sum((payment.amount for payment in invoice.payments.all()), Decimal("0.00"))
            if invoice.status == Invoice.Status.PAID and paid != invoice.grand_total:
                raise CommandError(f"{invoice.number} is paid but the receipts do not match the total.")
            if invoice.status == Invoice.Status.PARTIAL and not (Decimal("0.00") < paid < invoice.grand_total):
                raise CommandError(f"{invoice.number} is partial but the receipt amount is not between zero and the total.")
            if invoice.status in {Invoice.Status.UNPAID, Invoice.Status.DRAFT, Invoice.Status.CANCELLED} and paid != 0:
                raise CommandError(f"{invoice.number} should not have a receipt.")
        for usage in PartsUsage.objects.filter(repair_job__booking__note__startswith=MARKER):
            if usage.total != money(usage.unit_price * usage.quantity):
                raise CommandError("A parts line total does not match its price and quantity.")
            on_hand = usage.spare_part.quantity + (usage.quantity if usage.stock_applied else 0)
            if usage.quantity > on_hand:
                raise CommandError(f"{usage.spare_part.part_number} was used for more than the quantity on hand.")

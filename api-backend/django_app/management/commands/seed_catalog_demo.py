"""Opt-in catalog demo seed for empty remote databases (e.g. Render).

Creates only public catalog rows: service categories, services, spare-part
categories, spare parts, and blog posts. Never creates customers, vehicles,
bookings, payments, staff, or admin users. Never deletes or overwrites
existing business data (get_or_create / fill empty image only).

Enable explicitly via DJANGO_SEED_DEMO=1 (entrypoint) or:
  python manage.py seed_catalog_demo
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from django_app.models import BlogPost, Service, ServiceCategory, SparePart, SparePartCategory

SEED_MARKER = "carsv-catalog-demo"


def money(value: str) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


class Command(BaseCommand):
    help = "Idempotent public catalog seed (services/parts/blog). Opt-in only; never touches users or private data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-images",
            action="store_true",
            help="Require catalog image files under MEDIA_ROOT (default: warn and skip missing images).",
        )

    def handle(self, *args, **options):
        require_images = bool(options.get("force_images"))
        before = self._counts()
        with transaction.atomic():
            self._services(require_images=require_images)
            self._parts(require_images=require_images)
            self._blog(require_images=require_images)
        after = self._counts()
        self.stdout.write(self.style.SUCCESS("Catalog demo seed finished (idempotent)."))
        for label in after:
            added = after[label] - before[label]
            self.stdout.write(f"  {label}: {after[label]} ({added} new)")
        self.stdout.write("Did not create or modify: users, customers, vehicles, bookings, payments, staff.")

    def _counts(self):
        return {
            "service_categories": ServiceCategory.objects.count(),
            "services": Service.objects.count(),
            "part_categories": SparePartCategory.objects.count(),
            "parts": SparePart.objects.count(),
            "blog_posts": BlogPost.objects.count(),
        }

    def _media(self, relative: str, *, require: bool) -> str:
        path = Path(settings.MEDIA_ROOT) / relative
        if path.is_file():
            return relative
        if require:
            raise CommandError(f"Missing catalog image file: {relative}")
        self.stdout.write(self.style.WARNING(f"Skipping missing image: {relative}"))
        return ""

    def _services(self, *, require_images: bool):
        categories = {
            name: ServiceCategory.objects.get_or_create(name=name, defaults={"status": "ACTIVE"})[0]
            for name in ("Brake", "Engine", "Maintenance", "Tires", "AC", "Electrical", "Transmission")
        }
        rows = [
            ("Oil change", "Maintenance", "35.00", 45, "services/service-oil-change.jpg", "Drain and refill engine oil; replace the oil filter when fitted."),
            ("General inspection", "Maintenance", "25.00", 60, "services/service-engine-diagnostic.jpg", "Walk-around and basic systems check before a trip or after a warning light."),
            ("Wheel alignment", "Tires", "45.00", 60, "services/service-wheel-alignment.jpg", "Camber, caster, and toe adjustment on the alignment rack."),
            ("AC recharge", "AC", "70.00", 75, "services/service-ac-charge.jpg", "Recover, vacuum, and recharge the air-conditioning system."),
            ("Brake fluid flush", "Brake", "40.00", 50, "products/brakes-03-rotor-caliper-on-lift.jpg", "Replace old brake fluid and bleed the system."),
            ("Spark plug replacement", "Engine", "55.00", 60, "parts/part-spark-plugs-set.jpg", "Replace the spark plug set and check the coils."),
            ("Cabin filter replacement", "Maintenance", "20.00", 30, "parts/part-cabin-air-filter.jpg", "Replace the cabin air filter."),
            ("Battery replacement", "Electrical", "95.00", 40, "parts/part-car-battery-agm.jpg", "Test the charging system and fit a replacement battery when it has failed."),
            ("Transmission service", "Transmission", "120.00", 90, "products/transmission-01-socket-wrench-engine.jpg", "Drain and fill automatic transmission fluid and replace the filter when the pan is dropped."),
            ("Coolant flush", "Engine", "48.00", 50, "products/engine-01-socket-wrench-work.jpg", "Drain the cooling system and refill with the correct coolant."),
            ("Brake repair", "Brake", "80.00", 90, "services/service-brake-repair.jpg", "Inspect pads, rotors, and hydraulics; quote parts before fitting."),
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
                rel = self._media(image, require=require_images)
                if rel:
                    Service.objects.filter(pk=service.pk, image="").update(image=rel)

    def _parts(self, *, require_images: bool):
        categories = {
            name: SparePartCategory.objects.get_or_create(name=name, defaults={"status": "ACTIVE"})[0]
            for name in ("Brake", "Engine", "Electrical", "Maintenance", "Tires", "Transmission", "AC", "Filters")
        }
        rows = [
            ("BRK-PAD-CER", "Ceramic brake pads", "Brake", "Brembo", "65.00", 10, 2, "parts/part-ceramic-brake-pads.jpg"),
            ("OIL-SYN-5W30", "Synthetic motor oil 5W-30", "Engine", "Mobil", "38.00", 24, 6, "parts/part-synthetic-motor-oil.jpg"),
            ("BAT-AGM-70", "AGM car battery 70Ah", "Electrical", "Bosch", "145.00", 6, 2, "parts/part-car-battery-agm.jpg"),
            ("SPK-IR-SET", "Iridium spark plug set", "Engine", "NGK", "48.00", 12, 3, "parts/part-spark-plugs-set.jpg"),
            ("ENG-OIL-H01", "Engine oil filter", "Engine", "Mann", "12.00", 30, 8, "parts/part-engine-oil-filter.jpg"),
            ("BRK-FLD-01", "Brake fluid DOT 4", "Brake", "Bosch", "12.00", 24, 6, "products/brakes-04-large-brake-assembly.jpg"),
            ("CLT-GRN-01", "Green coolant 5L", "Engine", "Toyota", "18.00", 16, 4, "products/engine-03-tablet-inspection-battery.jpg"),
            ("TIR-195-01", "Tire 195/65R15", "Tires", "Michelin", "89.00", 12, 4, "products/tires-02-mechanic-holding-tire.jpg"),
            ("CAB-FLT-02", "Activated cabin filter", "Filters", "Mann", "14.00", 18, 4, "parts/part-cabin-air-filter.jpg"),
            ("WPR-BLD-01", "Wiper blade set", "Maintenance", "Bosch", "22.00", 16, 4, "parts/part-wiper-blades-set.jpg"),
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
                rel = self._media(image, require=require_images)
                if rel:
                    SparePart.objects.filter(pk=part.pk, image="").update(image=rel)

    def _blog(self, *, require_images: bool):
        posts = [
            (
                "wheel-alignment-at-carsv",
                "What a wheel alignment includes",
                "Tires",
                "The alignment rack measures camber, caster, and toe.",
                "A pull to one side or a steering wheel that sits off center is a reason to book the alignment.\n\n"
                f"({SEED_MARKER})",
                "Mention which way the car pulls.",
                "services/service-wheel-alignment.jpg",
                True,
                date(2026, 9, 12),
            ),
            (
                "brake-fluid-flush",
                "When the brake fluid is due",
                "Brakes",
                "Brake fluid absorbs moisture. A flush is its own bookable service.",
                "Dark fluid or a soft pedal is a reason to book the brake fluid flush.\n\n"
                f"({SEED_MARKER})",
                "Say if the pedal sinks while you are stopped.",
                "products/brakes-04-large-brake-assembly.jpg",
                True,
                date(2026, 8, 28),
            ),
            (
                "oil-change-basics",
                "Oil change intervals that matter",
                "Maintenance",
                "Fresh oil and a filter keep the engine cool and clean.",
                "Book the oil-change service when the interval or oil-life monitor is due.\n\n"
                f"({SEED_MARKER})",
                "Bring the last service invoice if you have it.",
                "blog/oil-change-pouring-mobil1.jpg",
                True,
                date(2026, 9, 1),
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
                rel = self._media(image, require=require_images)
                if rel:
                    BlogPost.objects.filter(pk=post.pk, image="").update(image=rel)

# all-image (source library)

Categorized source pack. **Deployed copies** live in the app:

| Destination | Path |
| --- | --- |
| Frontend | `carsv-aub/web-frontend/public/images/` |
| Backend | `carsv-aub/api-backend/django_app/static/django_app/images/` |

App URLs:
- Frontend: `/images/people/...`, `/images/cars/...`, `/images/inventory/...`, `/images/others/...`
- Backend/admin: `/static/django_app/images/...`


## Categories

| Folder | Count | What belongs here |
| --- | ---: | --- |
| `people/` | 11 | Portraits / profile avatars (customers, staff) |
| `cars/` | 12 | Full vehicle photos |
| `inventory/` | 39 | Parts product shots + catalog (AC, brakes, engine, maintenance, tires, transmission) |
| `others/` | 11 | Workshop/service scenes, cafe, aerial road |

**Total: 73** image files.

## Naming style

- Short kebab-case: `woman-striped-shirt-outdoor.jpg`
- Inventory products: `part-cabin-air-filter.jpg`
- Catalog series: `brakes-02-brembo-caliper-assembly.jpg`

## people/

- `man-glasses-green-polo.jpg`
- `man-grey-sweater-studio.jpg`
- `man-profile-curly-beard-bw.jpg`
- `man-smiling-white-vneck.jpg`
- `woman-office-blazer-laptop.jpg`
- `woman-portrait-blue-lighting.jpg`
- `woman-smiling-hair-bun.jpg`
- `woman-striped-shirt-outdoor.jpg` ← was `photo-1544005313-94ddf0286df2.jpg`
- `young-man-beard-dark-sweater.jpg`
- `young-man-mandarin-collar.jpg`
- `young-man-smiling-outdoor-jacket.jpg`

## cars/

- `black-mercedes-amg-gt-harbor.jpg`
- `black-porsche-panamera-highway.jpg`
- `black-range-rover-front.jpg`
- `grey-toyota-camry-industrial.jpg`
- `orange-bmw-m3-palm-street.jpg`
- `red-ferrari-laferrari-showroom.jpg`
- `silver-bmw-coupe-sunset.jpg`
- `white-audi-suv-snow-road.jpg`
- `white-camaro-luxury-garage.jpg`
- `white-ford-expedition-desert.jpg`
- `white-mercedes-suv-garage-neon.jpg`
- `yellow-mercedes-amg-gt-highway.jpg`

## inventory/

### Product shots (`inventory/`)

- `part-cabin-air-filter.jpg`
- `part-car-battery-agm.jpg`
- `part-ceramic-brake-pads.jpg`
- `part-engine-oil-filter.jpg`
- `part-performance-tire.jpg`
- `part-slotted-brake-rotor.jpg`
- `part-spark-plugs-set.jpg`
- `part-synthetic-motor-oil.jpg`
- `part-wiper-blades-set.jpg`

### Catalog (`inventory/catalog/`)

AC, brakes, engine, maintenance, tires, transmission — each with descriptive names (e.g. `ac-01-dashboard-vent-gauge-check.jpg`).

## others/

- `aerial-city-highway-interchange.jpg`
- `bmw-wheel-impact-wrench-service.jpg`
- `cafe-interior-broel.jpg`
- `engine-bay-serpentine-belt.jpg`
- `mechanic-hands-wrench-engine.jpg`
- `oil-change-pouring-mobil1.jpg`
- `service-ac-charge.jpg`
- `service-brake-repair.jpg`
- `service-engine-diagnostic.jpg`
- `service-oil-change.jpg`
- `service-wheel-alignment.jpg`

## Note

This folder is a **reference library** only. App code still points at original paths / Unsplash URLs unless you wire it to these files later.

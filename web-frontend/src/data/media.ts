/** Local media library (from all-image → public/images). */
export const media = {
  people: {
    manGlassesGreenPolo: '/images/people/man-glasses-green-polo.jpg',
    manGreySweaterStudio: '/images/people/man-grey-sweater-studio.jpg',
    manProfileCurlyBeardBw: '/images/people/man-profile-curly-beard-bw.jpg',
    manSmilingWhiteVneck: '/images/people/man-smiling-white-vneck.jpg',
    womanOfficeBlazerLaptop: '/images/people/woman-office-blazer-laptop.jpg',
    womanPortraitBlueLighting: '/images/people/woman-portrait-blue-lighting.jpg',
    womanSmilingHairBun: '/images/people/woman-smiling-hair-bun.jpg',
    womanStripedShirtOutdoor: '/images/people/woman-striped-shirt-outdoor.jpg',
    youngManBeardDarkSweater: '/images/people/young-man-beard-dark-sweater.jpg',
    youngManMandarinCollar: '/images/people/young-man-mandarin-collar.jpg',
    youngManSmilingOutdoorJacket: '/images/people/young-man-smiling-outdoor-jacket.jpg',
  },
  cars: {
    blackMercedesAmgGtHarbor: '/images/cars/black-mercedes-amg-gt-harbor.jpg',
    blackPorschePanameraHighway: '/images/cars/black-porsche-panamera-highway.jpg',
    blackRangeRoverFront: '/images/cars/black-range-rover-front.jpg',
    greyToyotaCamryIndustrial: '/images/cars/grey-toyota-camry-industrial.jpg',
    orangeBmwM3PalmStreet: '/images/cars/orange-bmw-m3-palm-street.jpg',
    redFerrariLaferrariShowroom: '/images/cars/red-ferrari-laferrari-showroom.jpg',
    silverBmwCoupeSunset: '/images/cars/silver-bmw-coupe-sunset.jpg',
    whiteAudiSuvSnowRoad: '/images/cars/white-audi-suv-snow-road.jpg',
    whiteCamaroLuxuryGarage: '/images/cars/white-camaro-luxury-garage.jpg',
    whiteFordExpeditionDesert: '/images/cars/white-ford-expedition-desert.jpg',
    whiteMercedesSuvGarageNeon: '/images/cars/white-mercedes-suv-garage-neon.jpg',
    yellowMercedesAmgGtHighway: '/images/cars/yellow-mercedes-amg-gt-highway.jpg',
  },
  inventory: {
    cabinAirFilter: '/images/inventory/part-cabin-air-filter.jpg',
    carBatteryAgm: '/images/inventory/part-car-battery-agm.jpg',
    ceramicBrakePads: '/images/inventory/part-ceramic-brake-pads.jpg',
    engineOilFilter: '/images/inventory/part-engine-oil-filter.jpg',
    performanceTire: '/images/inventory/part-performance-tire.jpg',
    slottedBrakeRotor: '/images/inventory/part-slotted-brake-rotor.jpg',
    sparkPlugsSet: '/images/inventory/part-spark-plugs-set.jpg',
    syntheticMotorOil: '/images/inventory/part-synthetic-motor-oil.jpg',
    wiperBladesSet: '/images/inventory/part-wiper-blades-set.jpg',
    brakesDiscRotor: '/images/inventory/catalog/brakes-01-disc-rotor-caliper.jpg',
    brakesBrembo: '/images/inventory/catalog/brakes-02-brembo-caliper-assembly.jpg',
    tiresWarehouse: '/images/inventory/catalog/tires-03-tread-closeup-warehouse.jpg',
    transmissionGears: '/images/inventory/catalog/transmission-02-gears-timing-chain-hands.jpg',
    acRechargeMachine: '/images/inventory/catalog/ac-05-ac-recharge-machine-shop.jpg',
    engineBayDetail: '/images/inventory/catalog/engine-02-engine-bay-detail.jpg',
  },
  others: {
    aerialHighway: '/images/others/aerial-city-highway-interchange.jpg',
    bmwWheelService: '/images/others/bmw-wheel-impact-wrench-service.jpg',
    cafeInterior: '/images/others/cafe-interior-broel.jpg',
    engineSerpentineBelt: '/images/others/engine-bay-serpentine-belt.jpg',
    mechanicHandsWrench: '/images/others/mechanic-hands-wrench-engine.jpg',
    oilChangeMobil1: '/images/others/oil-change-pouring-mobil1.jpg',
    serviceAcCharge: '/images/others/service-ac-charge.jpg',
    serviceBrakeRepair: '/images/others/service-brake-repair.jpg',
    serviceEngineDiagnostic: '/images/others/service-engine-diagnostic.jpg',
    serviceOilChange: '/images/others/service-oil-change.jpg',
    serviceWheelAlignment: '/images/others/service-wheel-alignment.jpg',
  },
} as const;

/** Default fallbacks used across the app. */
export const defaultAvatar = media.people.manGlassesGreenPolo;
export const defaultCar = media.cars.whiteMercedesSuvGarageNeon;
export const defaultService = media.others.serviceOilChange;
export const defaultWorkshop = media.others.mechanicHandsWrench;

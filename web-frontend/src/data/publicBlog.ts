export interface PublicBlogPost {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
  author: string;
  image: string;
  featured?: boolean;
  body: string[];
  tips: string[];
}

export interface PublicBlogOffer {
  id: string;
  badge: string;
  title: string;
  detail: string;
  price: string;
}

export const PUBLIC_BLOG_POSTS: PublicBlogPost[] = [
  {
    id: 'oil-change',
    category: 'Maintenance',
    title: 'How often should you change engine oil in Phnom Penh?',
    excerpt: 'City heat and stop-go traffic break oil down faster. Most daily drivers need a change every 5,000–8,000 km.',
    readTime: '5 min',
    date: '2 Sep 2026',
    author: 'CarSV Workshop Desk',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=900&auto=format&fit=crop&q=80',
    featured: true,
    body: [
      'Engine oil cools, cleans, and protects metal parts. In Phnom Penh, long idle time at lights and 35°C afternoons cook the oil sooner than highway driving in a cooler country.',
      'A practical rule for this city: conventional oil around 5,000 km, quality synthetic around 8,000–10,000 km, or at least twice a year if you drive little. Hybrids still need interval changes — the engine still starts and the oil still ages.',
      'Dark oil on the dipstick, a light tick on cold start, or a delayed oil-life warning are reasons to book now, not next month. We replace the filter, inspect for leaks, and reset the reminder so your next visit is on the calendar.'
    ],
    tips: [
      'Check the level on level ground when the engine is warm, not after a hard drive.',
      'Use the viscosity printed on the filler cap (often 0W-20 or 5W-30).',
      'Keep the last invoice — it helps warranty and resale.'
    ]
  },
  {
    id: 'brake-signs',
    category: 'Brakes',
    title: 'Warning signs your brake pads are worn',
    excerpt: 'Squeal, a longer stop, or a vibrating pedal usually means pads or rotors need a look this week.',
    readTime: '4 min',
    date: '28 Aug 2026',
    author: 'Dara Kim, Master Tech',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=900&auto=format&fit=crop&q=80',
    body: [
      'Pads have a wear layer that squeals before metal hits the rotor. If you hear a sharp squeak at traffic lights, or the steering wheel shudders under braking, do not wait for the grinding stage.',
      'Wet-season traffic makes weak brakes more dangerous. Stopping distance grows quietly. We measure pad thickness, check fluid colour, and show the work on the bay camera so you see the old parts come off.'
    ],
    tips: [
      'A soft pedal can mean air or old fluid — ask for a fluid test.',
      'Replace pads in axle pairs, not one wheel only.',
      'After new pads, the first 200 km needs gentle stops to bed them in.'
    ]
  },
  {
    id: 'battery-heat',
    category: 'Electrical',
    title: 'Car batteries and Cambodia heat',
    excerpt: 'Heat shortens battery life. A slow crank at 7 AM is an early warning, not a surprise on Monday.',
    readTime: '4 min',
    date: '20 Aug 2026',
    author: 'CarSV Electrical Bay',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=900&auto=format&fit=crop&q=80',
    body: [
      'A typical 12V battery lasts about 2–3 years here because heat ages the plates and dries the cells. Dim headlights at idle or a starter that turns slowly means test both battery and alternator.',
      'Before a trip to Siem Reap or the coast, a 10-minute load test is cheaper than a roadside call. We clean terminals, check parasitic drain, and stock common Japanese and Korean sizes.'
    ],
    tips: [
      'Do not leave cabin lights or a dashcam hard-wired without a low-voltage cut-off.',
      'After a jump start, drive at least 20 minutes or have us charge and test it.',
      'Replace in pairs if you have a dual-battery setup on a van.'
    ]
  },
  {
    id: 'ac-rainy',
    category: 'Climate',
    title: 'Why AC service matters before rainy season',
    excerpt: 'Weak cooling and a musty smell often mean a dirty cabin filter or low refrigerant — not “just weather”.',
    readTime: '4 min',
    date: '12 Aug 2026',
    author: 'CarSV Climate Team',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&auto=format&fit=crop&q=80',
    body: [
      'Humidity works the compressor hard. A clogged cabin filter makes the blower smell and the glass fog. Low refrigerant makes the cabin stay warm even on max.',
      'A proper service is not only gas. We check performance, look for leaks, replace the pollen filter, and confirm the drain is not blocked so water does not sit on the evaporator.'
    ],
    tips: [
      'Run AC weekly in the dry season so seals stay oiled.',
      'If you smell mildew, change the cabin filter first — it is inexpensive.',
      'Book before October rains if your glass fogs on the school run.'
    ]
  },
  {
    id: 'oil-grade',
    category: 'Parts',
    title: 'What 5W-30 and 0W-20 on the oil bottle mean',
    excerpt: 'The number is viscosity, not a brand. The owner’s manual grade protects the engine and the warranty.',
    readTime: '5 min',
    date: '4 Aug 2026',
    author: 'Parts Counter',
    image: 'https://images.unsplash.com/photo-1632823471565-1ecdf5c6da5d?w=900&auto=format&fit=crop&q=80',
    body: [
      'The first number (0W or 5W) is cold flow. The second (20 or 30) is thickness when hot. Newer hybrids often specify 0W-16 or 0W-20. Older or hotter engines may need 5W-30.',
      'Topping up with a random cheap bottle can raise wear. We stock OEM-matched grades and will read the cap and the service book with you before we pour.'
    ],
    tips: [
      'Never mix diesel oil into a gasoline engine.',
      'Keep one litre of the correct grade in the trunk for long trips.',
      'Ask us to show the bottle spec next to your owner’s manual.'
    ]
  },
  {
    id: 'tire-rain',
    category: 'Tires',
    title: 'Tire pressure and wet-road safety',
    excerpt: 'Under-inflated tires overheat, wear the edges, and hydroplane earlier. Check them once a month.',
    readTime: '4 min',
    date: '29 Jul 2026',
    author: 'CarSV Tire Bay',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=900&auto=format&fit=crop&q=80',
    body: [
      'Use the PSI on the driver door sticker, not the maximum on the sidewall. Low pressure in rain reduces grip and grows stopping distance.',
      'Rotate about every 8,000–10,000 km. Replace when tread is under 3 mm if you drive in monsoon water. Uneven inner wear often means alignment, not only cheap tires.'
    ],
    tips: [
      'Check pressure when tires are cold, before a long drive.',
      'The spare needs air too — we see flats that are also flat in the trunk.',
      'After hitting a deep pothole, ask for a balance and alignment check.'
    ]
  },
  {
    id: 'hybrid-care',
    category: 'Hybrid',
    title: 'Caring for a Toyota hybrid in city traffic',
    excerpt: 'Hybrids still need brakes, coolant, and inverters checked. Quiet does not mean maintenance-free.',
    readTime: '5 min',
    date: '18 Jul 2026',
    author: 'Hybrid Specialist',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=900&auto=format&fit=crop&q=80',
    body: [
      'Regenerative braking saves pads, but the hydraulic system still ages. Inverter coolant and the 12V auxiliary battery are common “surprise” items on Camrys and Crosses in this climate.',
      'We follow Toyota interval logic: oil, filters, brake fluid, and hybrid health screens. If you hear a pump after shutdown or see a triangle warning, stop and book — do not keep driving to “see if it clears”.'
    ],
    tips: [
      'The 12V battery can fail even when the hybrid pack is healthy.',
      'Use the correct inverter coolant — not generic green mix.',
      'A scan after any dashboard light is cheaper than guessing.'
    ]
  },
  {
    id: 'service-intervals',
    category: 'Maintenance',
    title: 'A simple 10,000 km service checklist',
    excerpt: 'Oil, filters, brakes, and a short road test cover most daily-driver needs between major services.',
    readTime: '4 min',
    date: '6 Jul 2026',
    author: 'Service Advisor',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&auto=format&fit=crop&q=80',
    body: [
      'Think in layers: every visit we check lights, wipers, and fluids. Every oil change we inspect brakes and tires. Every 20,000–40,000 km we talk spark plugs, transmission service, or coolant — depending on the car.',
      'Bring the last invoice. It stops duplicate work and shows us what another shop already changed. You can store those PDFs in the customer portal after you create a free account — the blog itself stays open to everyone.'
    ],
    tips: [
      'Write the odometer on every invoice.',
      'Mention new noises in the booking notes so the right bay is reserved.',
      'Ask for photos if you cannot wait in the lounge.'
    ]
  },
  {
    id: 'flood-aftercare',
    category: 'Safety',
    title: 'If your car drove through deep water',
    excerpt: 'Do not keep revving. Water in the intake or electrics can turn a puddle into an engine claim.',
    readTime: '5 min',
    date: '22 Jun 2026',
    author: 'CarSV Safety Desk',
    image: 'https://images.unsplash.com/photo-1465447142348-e9952c393450?w=900&auto=format&fit=crop&q=80',
    body: [
      'If the engine stumbled in water, stop. Restarting can bend rods. Tow it in. We check the air box, oil for milkiness, and electrical connectors.',
      'Even a successful crossing can soak carpets and grow mould. Dry the cabin, replace the cabin filter, and ask us to inspect brakes that were dunked — wet pads rust and pull to one side.'
    ],
    tips: [
      'Never drive a stalled flooded car “to dry it out”.',
      'Photograph the water line for insurance.',
      'Change oil if you suspect water ingestion.'
    ]
  },
  {
    id: 'parts-prices',
    category: 'Parts',
    title: 'How we price oil, filters, and brake parts',
    excerpt: 'List prices on the blog are starting points. Your invoice shows the exact brand fitted to your car.',
    readTime: '3 min',
    date: '10 Jun 2026',
    author: 'CarSV Store',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=900&auto=format&fit=crop&q=80',
    body: [
      'Public prices help you plan. A quality 4-litre synthetic fill often starts around the mid-range bottles we stock; OEM pads cost more than economy sets but last longer in city heat.',
      'We do not hide labour. The booking estimate and the final invoice list parts and hours separately. If a cheaper alternative exists, the advisor will say so before we start.'
    ],
    tips: [
      'Ask for OEM vs quality aftermarket — both are labelled.',
      'Keep packaging for warranty on pads and batteries.',
      'Bundle oil + filter + inspection when we run a seasonal offer.'
    ]
  }
];

export const PUBLIC_BLOG_OFFERS: PublicBlogOffer[] = [
  {
    id: 'oil-promo',
    badge: 'September offer',
    title: 'Full synthetic oil + filter',
    detail: 'Includes 20-point check and reminder reset. Most 4-cyl petrol and hybrid cars.',
    price: 'From $49'
  },
  {
    id: 'brake-promo',
    badge: 'Safety',
    title: 'Front brake inspection',
    detail: 'Pad measure, rotor check, and a short road test. You can watch Bay #02 on camera.',
    price: 'From $15'
  },
  {
    id: 'ac-promo',
    badge: 'Rainy season',
    title: 'AC performance + cabin filter',
    detail: 'Cooling test, drain check, and a fresh pollen filter before monsoon traffic.',
    price: 'From $35'
  },
  {
    id: 'battery-promo',
    badge: 'Electrical',
    title: 'Battery load test',
    detail: '10-minute test of battery and charging system. Replacement fitted the same day if needed.',
    price: 'Free with service'
  }
];

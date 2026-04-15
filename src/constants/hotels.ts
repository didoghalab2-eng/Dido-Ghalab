export const REGIONS = [
  { id: 'gouna', label: 'الجونة' },
  { id: 'hurghada', label: 'الغردقة' },
  { id: 'sahl_hasheesh', label: 'سهل حشيش' },
  { id: 'makadi', label: 'مكادي' },
  { id: 'abu_soma', label: 'أبو سوما' },
  { id: 'safaga', label: 'سفاجا' },
  { id: 'quseir', label: 'القصير' },
  { id: 'port_ghalib', label: 'بورت غالب' },
  { id: 'marsa_alam', label: 'مرسي علم' },
  { id: 'south_marsa_alam', label: 'جنوب مرسي علم' },
  { id: 'hamata', label: 'حماطة' },
];

export const HOTELS_BY_REGION: Record<string, string[]> = {
  gouna: ['Movenpick Resort', 'Sheraton Miramar', 'Steigenberger Golf Resort', 'Casa Cook', 'The Chedi'],
  hurghada: ['Steigenberger ALDAU', 'Sunrise Crystal Bay', 'Desert Rose Resort', 'Hilton Hurghada Plaza', 'Marriott Beach Resort'],
  sahl_hasheesh: ['Baron Palace', 'Tropitel Sahl Hasheesh', 'Old Palace Resort', 'Sunrise Romance', 'KaiSol Romance'],
  makadi: ['Jaz Makadi Star', 'Iberotel Makadi Beach', 'Sunrise Royal Makadi', 'Cleopatra Luxury Resort', 'Stella Di Mare'],
  abu_soma: ['Kempinski Hotel Soma Bay', 'Sheraton Soma Bay', 'The Westin Soma Bay', 'Robinson Soma Bay', 'Steigenberger Ras Soma'],
  safaga: ['Amarina Abu Soma', 'Movenpick Resort Soma Bay', 'Solymar Paradise', 'Lotus Bay Resort'],
  quseir: ['Movenpick Resort El Quseir', 'Radisson Blu Resort', 'Flamenco Beach Resort', 'Al Quseir Hotel'],
  port_ghalib: ['Pickalbatros Oasis', 'Pickalbatros Sands', 'Pickalbatros Palace', 'Marina Resort Port Ghalib'],
  marsa_alam: ['Hilton Marsa Alam Nubian', 'Jaz Lamaya Resort', 'Concorde Moreen Beach', 'Iberotel Costa Mares'],
  south_marsa_alam: ['Wadi Lahmy Azure', 'Lahami Bay Beach', 'Shams Alam Beach Resort'],
  hamata: ['Hamata Camp', 'Zabargad Resort'],
};

export const AIRPORTS = [
  'مطار الغردقة الدولي',
  'مطار مرسي علم الدولي',
  'مطار القاهرة الدولي',
  'مطار الأقصر الدولي',
  'مطار برج العرب الدولي',
];

export const TRIP_TYPES = [
  { id: 'arrival', label: 'وصول مطار' },
  { id: 'departure', label: 'سفر مطار' },
  { id: 'overday_luxor', label: 'أوفرداي الأقصر' },
  { id: 'overday_cairo', label: 'أوفرداي القاهرة' },
  { id: 'transfer_cairo', label: 'توصيلة القاهرة' },
  { id: 'transfer_aswan', label: 'توصيلة أسوان' },
  { id: 'transfer_abu_simbel', label: 'توصيلة أبو سمبل' },
  { id: 'transfer_other', label: 'توصيلة أخرى' },
  { id: 'internal_transfer', label: 'توصيلة داخلية' },
  { id: 'sea_trip', label: 'رحلة بحرية' },
  { id: 'safari', label: 'رحلة سفاري' },
  { id: 'city_tour', label: 'جولة بلد' },
];

export const TRIP_DISTANCES: Record<string, number> = {
  'overday_luxor': 600, // Round trip Hurghada-Luxor
  'overday_cairo': 1000, // Round trip Hurghada-Cairo
  'transfer_cairo': 500,
  'transfer_aswan': 550,
  'transfer_abu_simbel': 850,
  'arrival': 30, // Average airport transfer
  'departure': 30,
  'internal_transfer': 20,
  'sea_trip': 15,
  'safari': 40,
  'city_tour': 50,
};

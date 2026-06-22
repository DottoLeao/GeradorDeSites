const GENERIC_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "premise",
  "subpremise",
  "geocode",
]);

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bar: "Bar",
  bakery: "Padaria",
  beauty_salon: "Salão de beleza",
  hair_care: "Cabeleireiro",
  dentist: "Dentista",
  gym: "Academia",
  store: "Loja",
  clothing_store: "Loja de roupas",
  pharmacy: "Farmácia",
  veterinary_care: "Veterinário",
  car_repair: "Oficina mecânica",
  plumber: "Encanador",
  electrician: "Eletricista",
  lawyer: "Advogado",
  accounting: "Contabilidade",
  real_estate_agency: "Imobiliária",
  insurance_agency: "Seguradora",
  travel_agency: "Agência de viagens",
  pet_store: "Pet shop",
  florist: "Floricultura",
  laundry: "Lavanderia",
  spa: "Spa",
  physiotherapist: "Fisioterapeuta",
  chiropractor: "Quiropraxista",
  meal_delivery: "Delivery",
  meal_takeaway: "Retirada",
  night_club: "Casa noturna",
  liquor_store: "Loja de bebidas",
  furniture_store: "Móveis",
  home_goods_store: "Casa e decoração",
  hardware_store: "Loja de materiais",
  jewelry_store: "Joalheria",
  shoe_store: "Calçados",
  book_store: "Livraria",
  bicycle_store: "Bicicletas",
  auto_repair_shop: "Oficina automotiva",
  gas_station: "Posto de combustível",
  fuel: "Posto de combustível",
  supermarket: "Supermercado",
  convenience: "Conveniência",
  fast_food: "Fast food",
  hotel: "Hotel",
  hospital: "Hospital",
  doctor: "Médico",
  clinic: "Clínica",
  bank: "Banco",
  atm: "Caixa eletrônico",
  school: "Escola",
  university: "Universidade",
  church: "Igreja",
  mosque: "Mesquita",
  fitness_centre: "Academia",
  sports_centre: "Centro esportivo",
  car: "Concessionária",
  car_wash: "Lava-jato",
  butcher: "Açougue",
  greengrocer: "Hortifruti",
  optician: "Ótica",
  electronics: "Eletrônicos",
  mobile_phone: "Celulares",
  computer: "Informática",
  craft: "Artesanato",
  tailor: "Alfaiataria",
  dry_cleaning: "Tinturaria",
  copyshop: "Gráfica",
  stationery: "Papelaria",
  toys: "Brinquedos",
  kiosk: "Quiosque",
  mall: "Shopping",
  marketplace: "Mercado",
};

const DAY_NAMES_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const DAY_ALIASES: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terça: 2,
  "terça-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sábado: 6,
  sabado: 6,
};

function labelForType(type: string): string {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  return (
    TYPE_LABELS[normalized] ??
    type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatProspectCategory(
  types: string[],
  primaryTypeLabel?: string | null
): string | null {
  if (primaryTypeLabel?.trim()) return primaryTypeLabel.trim();

  const meaningful = types.filter((t) => !GENERIC_TYPES.has(t.toLowerCase()));
  if (meaningful.length === 0) return null;

  return labelForType(meaningful[0]);
}

export function formatTodayHours(
  openingHours: string[] | null | undefined
): string | null {
  if (!openingHours?.length) return null;

  const today = new Date().getDay();
  const todayName = DAY_NAMES_PT[today];

  for (const line of openingHours) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      if (openingHours.length === 1) return line;
      continue;
    }

    const dayPart = line.slice(0, colonIndex).trim().toLowerCase();
    const hoursPart = line.slice(colonIndex + 1).trim();

    const dayKey = Object.keys(DAY_ALIASES).find(
      (key) => dayPart === key || dayPart.startsWith(key)
    );
    if (dayKey != null && DAY_ALIASES[dayKey] === today) {
      return hoursPart || "Fechado";
    }

    if (dayPart === todayName || dayPart.startsWith(todayName.split("-")[0])) {
      return hoursPart || "Fechado";
    }
  }

  if (openingHours.length === 1 && !openingHours[0].includes(":")) {
    return openingHours[0];
  }

  return openingHours[0] ?? null;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function formatBusinessStatus(
  status: string | null | undefined
): string | null {
  if (!status) return null;
  switch (status.toUpperCase()) {
    case "OPERATIONAL":
      return null;
    case "CLOSED_TEMPORARILY":
      return "Fechado temporariamente";
    case "CLOSED_PERMANENTLY":
      return "Fechado permanentemente";
    default:
      return null;
  }
}

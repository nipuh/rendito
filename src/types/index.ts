export type InvestmentGoal = 'fix_flip' | 'eigenbezug' | 'kapitalanlage';

export type PropertyType = 'wohnung' | 'einfamilienhaus' | 'mehrfamilienhaus' | 'grundstueck' | 'gewerbe';

export type NoGo = 'erbpacht' | 'denkmalschutz' | 'erbbaurecht' | 'sanierungsstau';

export type Special = 'zwangsversteigerung' | 'teilungsversteigerung' | 'nachlassverkauf' | 'bankenverwertung' | 'sondereigentum';

export type SwipeDirection = 'like' | 'nope';

export type SourcePlatform = 'immoscout24' | 'immowelt' | 'kleinanzeigen';

export interface Region {
  plz?: string;
  city?: string;
  radius_km: number;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  investment_goals: InvestmentGoal[];
  regions: Region[];
  property_types: PropertyType[];
  budget_min: number;
  budget_max: number;
  no_gos: NoGo[];
  specials: Special[];
}

export interface Property {
  id: string;
  source_platform: SourcePlatform;
  source_url: string;
  source_id: string;
  title: string;
  price: number;
  living_area: number | null;
  plot_area: number | null;
  rooms: number | null;
  year_built: number | null;
  property_type: PropertyType;
  zip_code: string;
  city: string;
  state: string | null;
  description_original: string | null;
  description_ai: string | null;
  images: string[];
  is_erbpacht: boolean;
  is_denkmalschutz: boolean;
  is_provisionsfrei: boolean;
  hausgeld: number | null;
  energy_data: Record<string, unknown> | null;
  is_active: boolean;
  scraped_at: string;
  created_at: string;
}

export interface Swipe {
  id: string;
  user_id: string;
  property_id: string;
  direction: SwipeDirection;
  swiped_at: string;
}

export interface CashflowInputs {
  id?: string;
  user_id: string;
  property_id: string;
  eigenkapital: number;
  zinssatz: number;
  tilgung: number;
  laufzeit: number;
  instandhaltung_per_sqm: number;
  hausgeld_extra: number;
  mietausfall_prozent: number;
  geschaetzte_miete: number;
}

export interface CashflowResult {
  monatliche_rate: number;
  monatlicher_cashflow: number;
  bruttomietrendite: number;
  nettomietrendite: number;
  eigenkapitalrendite: number;
  faktor: number;
  status: 'hot' | 'warm' | 'cold';
}

// Kaufnebenkosten by Bundesland (Grunderwerbsteuer %)
export const GRUNDERWERBSTEUER: Record<string, number> = {
  'baden-wuerttemberg': 5.0,
  'bayern': 3.5,
  'berlin': 6.0,
  'brandenburg': 6.5,
  'bremen': 5.0,
  'hamburg': 5.5,
  'hessen': 6.0,
  'mecklenburg-vorpommern': 6.0,
  'niedersachsen': 5.0,
  'nordrhein-westfalen': 6.5,
  'rheinland-pfalz': 5.0,
  'saarland': 6.5,
  'sachsen': 5.5,
  'sachsen-anhalt': 5.0,
  'schleswig-holstein': 6.5,
  'thueringen': 5.0,
};

// Notar + Grundbuch ~2%, Makler ~3.57%
export const NOTAR_GRUNDBUCH_PROZENT = 2.0;
export const MAKLER_PROZENT = 3.57;

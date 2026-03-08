export interface ScrapedProperty {
  source_platform: string;
  source_url: string;
  source_id: string;
  title: string;
  price: number;
  living_area: number | null;
  plot_area: number | null;
  rooms: number | null;
  year_built: number | null;
  property_type: string;
  zip_code: string;
  city: string;
  state: string | null;
  description_original: string | null;
  images: string[];
  is_erbpacht: boolean;
  is_denkmalschutz: boolean;
  is_provisionsfrei: boolean;
  hausgeld: number | null;
  energy_data: Record<string, unknown> | null;
}

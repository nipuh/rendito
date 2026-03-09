import type { ScrapedProperty } from './types';

const IMMOWELT_BASE = 'https://www.immowelt.de';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface ImmoweltSearchParams {
  city?: string;
  zipCode?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  page?: number;
}

export function buildSearchUrl(params: ImmoweltSearchParams): string {
  let typeSlug = 'wohnungen';
  if (params.propertyType === 'einfamilienhaus') typeSlug = 'haeuser';
  else if (params.propertyType === 'mehrfamilienhaus') typeSlug = 'mehrfamilienhaeuser';
  else if (params.propertyType === 'grundstueck') typeSlug = 'grundstuecke';
  else if (params.propertyType === 'gewerbe') typeSlug = 'gewerbe';

  const citySlug = (params.city || 'berlin').toLowerCase().replace(/\s+/g, '-');
  let url = `${IMMOWELT_BASE}/liste/${citySlug}/${typeSlug}/kaufen`;

  const queryParams: string[] = [];
  if (params.priceMin) queryParams.push(`pmi=${params.priceMin}`);
  if (params.priceMax) queryParams.push(`pma=${params.priceMax}`);
  if (params.page && params.page > 1) queryParams.push(`page=${params.page}`);

  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&');
  }

  return url;
}

function extractListingsFromHtml(html: string): ScrapedProperty[] {
  const properties: ScrapedProperty[] = [];

  // Immowelt embeds data in __NEXT_DATA__ or similar JSON structures
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const items =
        nextData?.props?.pageProps?.estateOverviewList?.items ||
        nextData?.props?.pageProps?.searchResult?.items ||
        nextData?.props?.pageProps?.data?.items ||
        [];

      for (const item of items) {
        const parsed = parseImmoweltItem(item);
        if (parsed) properties.push(parsed);
      }

      if (properties.length > 0) return properties;
    } catch {
      // fallback to HTML parsing
    }
  }

  // Fallback: parse JSON-LD
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
        for (const el of data.itemListElement) {
          const item = el.item || el;
          const parsed = parseJsonLdItem(item);
          if (parsed) properties.push(parsed);
        }
      }
    } catch {
      // continue
    }
  }

  // Fallback: regex-based extraction from HTML listing cards
  if (properties.length === 0) {
    const cardPattern = /<div[^>]*data-testid="estate-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let cardMatch;
    while ((cardMatch = cardPattern.exec(html)) !== null) {
      const card = cardMatch[1];
      const parsed = parseHtmlCard(card);
      if (parsed) properties.push(parsed);
    }
  }

  return properties;
}

function parseImmoweltItem(item: Record<string, unknown>): ScrapedProperty | null {
  try {
    const id = String(item['onlineId'] || item['id'] || item['globalObjectKey'] || '');
    const title = String(item['title'] || item['headline'] || '');
    const price = extractImmoweltPrice(item);
    if (!title || !price) return null;

    const place = (item['place'] || item['address'] || item['location'] || {}) as Record<string, unknown>;
    const city = String(place['city'] || place['location'] || '');
    const zipCode = String(place['zipCode'] || place['postcode'] || '');
    const state = String(place['federalState'] || '');

    const areas = (item['areas'] || item['area'] || {}) as Record<string, unknown>;
    const livingSpace = parseFloat(String(areas['livingArea'] || areas['livingSpace'] || item['livingArea'] || '0')) || null;
    const plotArea = parseFloat(String(areas['plotArea'] || item['plotArea'] || '0')) || null;
    const rooms = parseFloat(String(item['rooms'] || item['numberOfRooms'] || '0')) || null;

    const images = extractImmoweltImages(item);
    const propertyType = mapImmoweltType(String(item['estateType'] || item['objectType'] || ''));

    return {
      source_platform: 'immowelt',
      source_url: `${IMMOWELT_BASE}/expose/${id}`,
      source_id: `iw-${id}`,
      title,
      price,
      living_area: livingSpace,
      plot_area: plotArea,
      rooms,
      year_built: parseInt(String(item['constructionYear'] || item['yearBuilt'] || '0'), 10) || null,
      property_type: propertyType,
      zip_code: zipCode,
      city,
      state,
      description_original: String(item['description'] || ''),
      images,
      is_erbpacht: false,
      is_denkmalschutz: false,
      is_provisionsfrei: String(item['courtage'] || item['commission'] || '').toLowerCase().includes('frei'),
      hausgeld: parseFloat(String(item['additionalCosts'] || item['serviceCharge'] || '0')) || null,
      energy_data: null,
    };
  } catch {
    return null;
  }
}

function extractImmoweltPrice(item: Record<string, unknown>): number {
  const priceObj = item['price'] as Record<string, unknown> | undefined;
  if (priceObj) {
    return parseFloat(String(priceObj['value'] || priceObj['amount'] || priceObj['price'] || '0')) || 0;
  }
  return parseFloat(String(item['price'] || item['buyPrice'] || '0')) || 0;
}

function extractImmoweltImages(item: Record<string, unknown>): string[] {
  const images: string[] = [];
  const mediaItems = (item['mediaItems'] || item['pictures'] || item['images'] || []) as unknown[];

  if (Array.isArray(mediaItems)) {
    for (const media of mediaItems) {
      if (typeof media === 'string') {
        images.push(media);
      } else if (typeof media === 'object' && media !== null) {
        const m = media as Record<string, unknown>;
        const url = String(m['uri'] || m['url'] || m['src'] || '');
        if (url) images.push(url);
      }
    }
  }

  // Fallback: title image
  if (images.length === 0) {
    const titleImg = item['titleImage'] || item['mainPicture'];
    if (typeof titleImg === 'string') {
      images.push(titleImg);
    } else if (typeof titleImg === 'object' && titleImg !== null) {
      const t = titleImg as Record<string, unknown>;
      const url = String(t['uri'] || t['url'] || t['src'] || '');
      if (url) images.push(url);
    }
  }

  return images.slice(0, 6);
}

function mapImmoweltType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes('wohnung') || lower.includes('apartment') || lower.includes('flat')) return 'wohnung';
  if (lower.includes('mehrfamilien') || lower.includes('multi')) return 'mehrfamilienhaus';
  if (lower.includes('haus') || lower.includes('house')) return 'einfamilienhaus';
  if (lower.includes('grundstueck') || lower.includes('plot')) return 'grundstueck';
  if (lower.includes('gewerbe') || lower.includes('commercial')) return 'gewerbe';
  return 'wohnung';
}

function parseJsonLdItem(item: Record<string, unknown>): ScrapedProperty | null {
  try {
    const name = String(item['name'] || '');
    const url = String(item['url'] || '');
    const id = url.split('/').pop() || '';

    const offer = (item['offers'] || {}) as Record<string, unknown>;
    const price = parseFloat(String(offer['price'] || item['price'] || '0')) || 0;
    if (!name || !price) return null;

    const address = (item['address'] || {}) as Record<string, unknown>;

    return {
      source_platform: 'immowelt',
      source_url: url.startsWith('http') ? url : `${IMMOWELT_BASE}${url}`,
      source_id: `iw-${id}`,
      title: name,
      price,
      living_area: parseFloat(String(item['floorSize'] || '0')) || null,
      plot_area: null,
      rooms: parseFloat(String(item['numberOfRooms'] || '0')) || null,
      year_built: null,
      property_type: 'wohnung',
      zip_code: String(address['postalCode'] || ''),
      city: String(address['addressLocality'] || ''),
      state: String(address['addressRegion'] || ''),
      description_original: String(item['description'] || ''),
      images: [],
      is_erbpacht: false,
      is_denkmalschutz: false,
      is_provisionsfrei: false,
      hausgeld: null,
      energy_data: null,
    };
  } catch {
    return null;
  }
}

function parseHtmlCard(html: string): ScrapedProperty | null {
  try {
    // Extract price from HTML
    const priceMatch = html.match(/(\d[\d.]*)\s*€/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : 0;
    if (!price) return null;

    // Extract title
    const titleMatch = html.match(/title="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract link/id
    const hrefMatch = html.match(/href="\/expose\/([^"]+)"/);
    const id = hrefMatch ? hrefMatch[1] : `iw-${Date.now()}`;

    // Extract area
    const areaMatch = html.match(/([\d,]+)\s*m²/);
    const area = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : null;

    // Extract rooms
    const roomsMatch = html.match(/([\d,]+)\s*(?:Zi|Zimmer|Räume)/i);
    const rooms = roomsMatch ? parseFloat(roomsMatch[1].replace(',', '.')) : null;

    // Extract city
    const locationMatch = html.match(/(\d{5})\s+([^<]+)/);
    const zipCode = locationMatch ? locationMatch[1] : '';
    const city = locationMatch ? locationMatch[2].trim() : '';

    return {
      source_platform: 'immowelt',
      source_url: `${IMMOWELT_BASE}/expose/${id}`,
      source_id: `iw-${id}`,
      title: title || `Immobilie in ${city}`,
      price,
      living_area: area,
      plot_area: null,
      rooms,
      year_built: null,
      property_type: 'wohnung',
      zip_code: zipCode,
      city,
      state: null,
      description_original: null,
      images: [],
      is_erbpacht: false,
      is_denkmalschutz: false,
      is_provisionsfrei: false,
      hausgeld: null,
      energy_data: null,
    };
  } catch {
    return null;
  }
}

/**
 * Scrape Immowelt search results.
 * Uses HTTP fetch + HTML/JSON parsing.
 */
export async function scrapeImmowelt(
  searchParams: ImmoweltSearchParams
): Promise<ScrapedProperty[]> {
  const url = buildSearchUrl(searchParams);
  console.log(`[Immowelt] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[Immowelt] HTTP ${response.status} for ${url}`);
      return [];
    }

    const html = await response.text();
    const properties = extractListingsFromHtml(html);

    console.log(`[Immowelt] Parsed ${properties.length} properties`);
    return properties;
  } catch (error) {
    console.error('[Immowelt] Scrape error:', error);
    return [];
  }
}

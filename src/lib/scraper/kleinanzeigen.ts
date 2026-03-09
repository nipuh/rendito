import type { ScrapedProperty } from './types';

const KLEINANZEIGEN_BASE = 'https://www.kleinanzeigen.de';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface KleinanzeigenSearchParams {
  city?: string;
  zipCode?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  page?: number;
}

export function buildSearchUrl(params: KleinanzeigenSearchParams): string {
  // Kleinanzeigen uses category IDs:
  // c208 = Wohnungen kaufen, c209 = Häuser kaufen, c207 = Grundstücke & Gärten
  let categoryId = 'c208'; // default: Wohnungen
  if (params.propertyType === 'einfamilienhaus' || params.propertyType === 'mehrfamilienhaus') {
    categoryId = 'c209';
  } else if (params.propertyType === 'grundstueck') {
    categoryId = 'c207';
  }

  const citySlug = (params.city || 'berlin').toLowerCase().replace(/\s+/g, '-').replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ß/g, 'ss');
  let url = `${KLEINANZEIGEN_BASE}/s-immobilien/${citySlug}/${categoryId}`;

  const queryParams: string[] = [];
  if (params.priceMin) queryParams.push(`price.from=${params.priceMin}`);
  if (params.priceMax) queryParams.push(`price.to=${params.priceMax}`);
  if (params.page && params.page > 1) {
    url = `${KLEINANZEIGEN_BASE}/s-immobilien/seite:${params.page}/${citySlug}/${categoryId}`;
  }

  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&');
  }

  return url;
}

function extractListingsFromHtml(html: string): ScrapedProperty[] {
  const properties: ScrapedProperty[] = [];

  // Try JSON-LD first
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

  if (properties.length > 0) return properties;

  // Fallback: parse ad listing items from HTML
  const adPattern = /<article[^>]*data-adid="(\d+)"[^>]*>([\s\S]*?)<\/article>/g;
  let adMatch;
  while ((adMatch = adPattern.exec(html)) !== null) {
    const adId = adMatch[1];
    const adHtml = adMatch[2];
    const parsed = parseAdHtml(adId, adHtml);
    if (parsed) properties.push(parsed);
  }

  // Alternative pattern for listing items
  if (properties.length === 0) {
    const listItemPattern = /<li[^>]*class="[^"]*ad-listitem[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
    let itemMatch;
    while ((itemMatch = listItemPattern.exec(html)) !== null) {
      const itemHtml = itemMatch[1];
      const idMatch = itemHtml.match(/data-adid="(\d+)"/);
      const adId = idMatch ? idMatch[1] : `ka-${Date.now()}-${properties.length}`;
      const parsed = parseAdHtml(adId, itemHtml);
      if (parsed) properties.push(parsed);
    }
  }

  return properties;
}

function parseJsonLdItem(item: Record<string, unknown>): ScrapedProperty | null {
  try {
    const name = String(item['name'] || '');
    const url = String(item['url'] || '');
    const id = url.match(/(\d+)$/)?.[1] || '';

    const offer = (item['offers'] || {}) as Record<string, unknown>;
    const price = parseFloat(String(offer['price'] || item['price'] || '0')) || 0;
    if (!name || !price) return null;

    const address = (item['address'] || {}) as Record<string, unknown>;

    const images: string[] = [];
    const imageField = item['image'];
    if (typeof imageField === 'string') {
      images.push(imageField);
    } else if (Array.isArray(imageField)) {
      for (const img of imageField) {
        if (typeof img === 'string') images.push(img);
        else if (typeof img === 'object' && img !== null) {
          const i = img as Record<string, unknown>;
          images.push(String(i['url'] || i['contentUrl'] || ''));
        }
      }
    }

    return {
      source_platform: 'kleinanzeigen',
      source_url: url.startsWith('http') ? url : `${KLEINANZEIGEN_BASE}${url}`,
      source_id: `ka-${id}`,
      title: name,
      price,
      living_area: parseFloat(String(item['floorSize'] || '0')) || null,
      plot_area: null,
      rooms: parseFloat(String(item['numberOfRooms'] || '0')) || null,
      year_built: null,
      property_type: guessPropertyType(name),
      zip_code: String(address['postalCode'] || ''),
      city: String(address['addressLocality'] || ''),
      state: String(address['addressRegion'] || ''),
      description_original: String(item['description'] || ''),
      images: images.filter(Boolean).slice(0, 6),
      is_erbpacht: name.toLowerCase().includes('erbpacht') || name.toLowerCase().includes('erbbau'),
      is_denkmalschutz: name.toLowerCase().includes('denkmal'),
      is_provisionsfrei: name.toLowerCase().includes('provisionsfrei') || name.toLowerCase().includes('courtage'),
      hausgeld: null,
      energy_data: null,
    };
  } catch {
    return null;
  }
}

function parseAdHtml(adId: string, html: string): ScrapedProperty | null {
  try {
    // Extract price
    const priceMatch = html.match(/([\d.]+)\s*€/) || html.match(/preis[^>]*>([\d.]+)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : 0;
    if (!price) return null;

    // Extract title
    const titleMatch = html.match(/class="[^"]*ellipsis[^"]*"[^>]*>([^<]+)/) ||
      html.match(/class="[^"]*text-module-begin[^"]*"[^>]*>([^<]+)/) ||
      html.match(/alt="([^"]+)"/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) return null;

    // Extract link
    const hrefMatch = html.match(/href="(\/s-anzeige\/[^"]+)"/);
    const href = hrefMatch ? hrefMatch[1] : `/s-anzeige/${adId}`;

    // Extract location
    const locationMatch = html.match(/(\d{5})\s+([^<]+)/);
    const zipCode = locationMatch ? locationMatch[1] : '';
    const city = locationMatch ? locationMatch[2].trim() : '';

    // Extract area
    const areaMatch = html.match(/([\d,]+)\s*m²/);
    const area = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : null;

    // Extract rooms
    const roomsMatch = html.match(/([\d,]+)\s*(?:Zimmer|Zi\.?)/i);
    const rooms = roomsMatch ? parseFloat(roomsMatch[1].replace(',', '.')) : null;

    // Extract image
    const imgMatch = html.match(/src="(https:\/\/[^"]*img\.ebayimg\.com[^"]+)"/);
    const images = imgMatch ? [imgMatch[1]] : [];

    return {
      source_platform: 'kleinanzeigen',
      source_url: `${KLEINANZEIGEN_BASE}${href}`,
      source_id: `ka-${adId}`,
      title,
      price,
      living_area: area,
      plot_area: null,
      rooms,
      year_built: null,
      property_type: guessPropertyType(title),
      zip_code: zipCode,
      city,
      state: null,
      description_original: null,
      images,
      is_erbpacht: title.toLowerCase().includes('erbpacht'),
      is_denkmalschutz: title.toLowerCase().includes('denkmal'),
      is_provisionsfrei: title.toLowerCase().includes('provisionsfrei'),
      hausgeld: null,
      energy_data: null,
    };
  } catch {
    return null;
  }
}

function guessPropertyType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('wohnung') || lower.includes('etw') || lower.includes('eigentum') || lower.includes('apartment')) return 'wohnung';
  if (lower.includes('mehrfamilien') || lower.includes('mfh') || lower.includes('renditeobjekt')) return 'mehrfamilienhaus';
  if (lower.includes('haus') || lower.includes('efh') || lower.includes('villa') || lower.includes('reihenhaus') || lower.includes('doppelhaus')) return 'einfamilienhaus';
  if (lower.includes('grundstueck') || lower.includes('grundstück') || lower.includes('bauland') || lower.includes('bauplatz')) return 'grundstueck';
  if (lower.includes('gewerbe') || lower.includes('laden') || lower.includes('buero') || lower.includes('büro')) return 'gewerbe';
  return 'wohnung';
}

/**
 * Scrape Kleinanzeigen search results.
 * Uses HTTP fetch + HTML/JSON-LD parsing.
 */
export async function scrapeKleinanzeigen(
  searchParams: KleinanzeigenSearchParams
): Promise<ScrapedProperty[]> {
  const url = buildSearchUrl(searchParams);
  console.log(`[Kleinanzeigen] Fetching: ${url}`);

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
      console.warn(`[Kleinanzeigen] HTTP ${response.status} for ${url}`);
      return [];
    }

    const html = await response.text();
    const properties = extractListingsFromHtml(html);

    console.log(`[Kleinanzeigen] Parsed ${properties.length} properties`);
    return properties;
  } catch (error) {
    console.error('[Kleinanzeigen] Scrape error:', error);
    return [];
  }
}

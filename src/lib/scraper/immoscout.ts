import type { ScrapedProperty } from './types';

const IMMOSCOUT_BASE = 'https://www.immobilienscout24.de';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface ImmoScoutSearchParams {
  city?: string;
  zipCode?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  page?: number;
}

export function buildSearchUrl(params: ImmoScoutSearchParams): string {
  const parts = [IMMOSCOUT_BASE, 'Suche'];

  if (params.propertyType === 'wohnung') {
    parts.push('de', 'wohnung-kaufen');
  } else if (params.propertyType === 'mehrfamilienhaus') {
    parts.push('de', 'mehrfamilienhaus-kaufen');
  } else if (params.propertyType === 'grundstueck') {
    parts.push('de', 'grundstueck-kaufen');
  } else {
    parts.push('de', 'haus-kaufen');
  }

  if (params.city) {
    parts.push(params.city.toLowerCase().replace(/\s+/g, '-'));
  }

  const url = new URL(parts.join('/'));
  if (params.priceMax) {
    url.searchParams.set('price', `${params.priceMin || ''}-${params.priceMax}`);
  }
  if (params.page && params.page > 1) {
    url.searchParams.set('pagenumber', String(params.page));
  }

  return url.toString();
}

function extractJsonFromScript(html: string): unknown[] {
  // ImmoScout embeds search results in a JSON structure within script tags
  const results: unknown[] = [];

  // Try to find resultlistentry data
  const searchResultPattern = /"resultlistEntry"\s*:\s*(\[[\s\S]*?\])\s*[,}]/;
  const match = html.match(searchResultPattern);
  if (match) {
    try {
      return JSON.parse(match[1]) as unknown[];
    } catch {
      // fallback to other patterns
    }
  }

  // Try IS24 __NEXT_DATA__ pattern
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const entries =
        nextData?.props?.pageProps?.searchResult?.resultlistEntry ||
        nextData?.props?.pageProps?.resultList?.resultlistEntry;
      if (Array.isArray(entries)) return entries;
    } catch {
      // continue
    }
  }

  // Try to find JSON-LD data
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
        return data.itemListElement;
      }
    } catch {
      // continue
    }
  }

  return results;
}

function parseResultEntry(entry: Record<string, unknown>): ScrapedProperty | null {
  try {
    const attrs = (entry['resultlist.realEstate'] || entry['realEstate'] || entry) as Record<string, unknown>;
    if (!attrs) return null;

    const id = String(attrs['@id'] || attrs['id'] || '');
    const title = String(attrs['title'] || '');
    const price = extractPrice(attrs);
    if (!title || !price) return null;

    const address = (attrs['address'] || {}) as Record<string, unknown>;
    const city = String(address['city'] || address['wpiCity'] || '');
    const zipCode = String(address['postcode'] || address['zipCode'] || '');
    const state = String(address['quarter'] || '');

    const livingSpace = parseFloat(String(attrs['livingSpace'] || '0')) || null;
    const plotArea = parseFloat(String(attrs['plotArea'] || '0')) || null;
    const numberOfRooms = parseFloat(String(attrs['numberOfRooms'] || '0')) || null;
    const yearBuilt = parseInt(String(attrs['yearConstructed'] || attrs['constructionYear'] || '0'), 10) || null;

    const imagesRaw = attrs['galleryAttachments'] as Record<string, unknown> | undefined;
    const images = extractImages(imagesRaw, attrs);

    const propertyType = mapPropertyType(String(attrs['@xsi.type'] || attrs['realEstateType'] || 'wohnung'));

    return {
      source_platform: 'immoscout24',
      source_url: `${IMMOSCOUT_BASE}/expose/${id}`,
      source_id: `is24-${id}`,
      title,
      price,
      living_area: livingSpace,
      plot_area: plotArea,
      rooms: numberOfRooms,
      year_built: yearBuilt,
      property_type: propertyType,
      zip_code: zipCode,
      city,
      state,
      description_original: String(attrs['descriptionNote'] || ''),
      images,
      is_erbpacht: false,
      is_denkmalschutz: false,
      is_provisionsfrei: String(attrs['courtage'] || '').toLowerCase().includes('frei'),
      hausgeld: parseFloat(String(attrs['serviceCharge'] || '0')) || null,
      energy_data: null,
    };
  } catch {
    return null;
  }
}

function extractPrice(attrs: Record<string, unknown>): number {
  const priceObj = attrs['price'] as Record<string, unknown> | undefined;
  if (priceObj) {
    return parseFloat(String(priceObj['value'] || priceObj['amount'] || '0')) || 0;
  }
  const buyPrice = parseFloat(String(attrs['buyingPrice'] || attrs['purchasePrice'] || '0'));
  return buyPrice || 0;
}

function extractImages(gallery: Record<string, unknown> | undefined, attrs: Record<string, unknown>): string[] {
  const images: string[] = [];

  if (gallery) {
    const attachments = (gallery['attachment'] || []) as Record<string, unknown>[];
    const list = Array.isArray(attachments) ? attachments : [attachments];
    for (const att of list) {
      const urls = att['urls'] as Record<string, unknown>[] | undefined;
      if (Array.isArray(urls)) {
        for (const u of urls) {
          const url = (u['url'] as Record<string, unknown>)?.['@href'] || u['@href'];
          if (url) images.push(String(url));
        }
      }
    }
  }

  // Fallback: titlePicture
  if (images.length === 0) {
    const titlePic = attrs['titlePicture'] as Record<string, unknown> | undefined;
    if (titlePic) {
      const urls = titlePic['urls'] as Record<string, unknown>[] | undefined;
      if (Array.isArray(urls)) {
        for (const u of urls) {
          const url = (u['url'] as Record<string, unknown>)?.['@href'] || u['@href'];
          if (url) images.push(String(url));
        }
      }
    }
  }

  return images.slice(0, 6);
}

function mapPropertyType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes('apartmentbuy') || lower.includes('wohnung')) return 'wohnung';
  if (lower.includes('housebuy') || lower.includes('haus')) return 'einfamilienhaus';
  if (lower.includes('multi') || lower.includes('mehrfamilien')) return 'mehrfamilienhaus';
  if (lower.includes('plot') || lower.includes('grundstueck')) return 'grundstueck';
  if (lower.includes('gewerbe') || lower.includes('commercial')) return 'gewerbe';
  return 'wohnung';
}

/**
 * Scrape ImmoScout24 search results.
 * Uses HTTP fetch + HTML parsing (no headless browser needed).
 */
export async function scrapeImmoScout(
  searchParams: ImmoScoutSearchParams
): Promise<ScrapedProperty[]> {
  const url = buildSearchUrl(searchParams);
  console.log(`[ImmoScout] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[ImmoScout] HTTP ${response.status} for ${url}`);
      return [];
    }

    const html = await response.text();
    const entries = extractJsonFromScript(html);

    const properties: ScrapedProperty[] = [];
    for (const entry of entries) {
      const parsed = parseResultEntry(entry as Record<string, unknown>);
      if (parsed && parsed.price > 0) {
        properties.push(parsed);
      }
    }

    console.log(`[ImmoScout] Parsed ${properties.length} properties`);
    return properties;
  } catch (error) {
    console.error('[ImmoScout] Scrape error:', error);
    return [];
  }
}

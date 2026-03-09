import type { ScrapedProperty } from './types';
import { scrapeImmoScout } from './immoscout';
import { scrapeImmowelt } from './immowelt';
import { scrapeKleinanzeigen } from './kleinanzeigen';

export interface SearchParams {
  city?: string;
  zipCode?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
}

/**
 * Search all platforms in parallel and return deduplicated, merged results.
 */
export async function searchAllPlatforms(
  params: SearchParams
): Promise<ScrapedProperty[]> {
  console.log('[Search] Starting parallel scrape across all platforms...', params);

  const [immoscoutResults, immoweltResults, kleinanzeigenResults] = await Promise.allSettled([
    scrapeImmoScout(params),
    scrapeImmowelt(params),
    scrapeKleinanzeigen(params),
  ]);

  const allResults: ScrapedProperty[] = [];

  if (immoscoutResults.status === 'fulfilled') {
    allResults.push(...immoscoutResults.value);
  } else {
    console.error('[Search] ImmoScout failed:', immoscoutResults.reason);
  }

  if (immoweltResults.status === 'fulfilled') {
    allResults.push(...immoweltResults.value);
  } else {
    console.error('[Search] Immowelt failed:', immoweltResults.reason);
  }

  if (kleinanzeigenResults.status === 'fulfilled') {
    allResults.push(...kleinanzeigenResults.value);
  } else {
    console.error('[Search] Kleinanzeigen failed:', kleinanzeigenResults.reason);
  }

  // Deduplicate by title + price (similar listings may appear on multiple platforms)
  const deduped = deduplicateResults(allResults);

  console.log(
    `[Search] Total: ${allResults.length} raw, ${deduped.length} after dedup ` +
    `(IS24: ${immoscoutResults.status === 'fulfilled' ? immoscoutResults.value.length : 0}, ` +
    `IW: ${immoweltResults.status === 'fulfilled' ? immoweltResults.value.length : 0}, ` +
    `KA: ${kleinanzeigenResults.status === 'fulfilled' ? kleinanzeigenResults.value.length : 0})`
  );

  return deduped;
}

function deduplicateResults(properties: ScrapedProperty[]): ScrapedProperty[] {
  const seen = new Map<string, ScrapedProperty>();

  for (const prop of properties) {
    // Create a dedup key from normalized title fragment + price
    const titleKey = prop.title.toLowerCase().replace(/\s+/g, '').slice(0, 40);
    const key = `${titleKey}-${prop.price}`;

    if (!seen.has(key)) {
      seen.set(key, prop);
    }
  }

  return Array.from(seen.values());
}

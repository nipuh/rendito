import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { searchAllPlatforms } from '@/lib/scraper/search';
import type { ScrapedProperty } from '@/lib/scraper/types';

/**
 * POST /api/properties/search
 *
 * Searches real estate platforms (ImmoScout24, Immowelt, Kleinanzeigen)
 * for listings matching the user's preferences. Results are stored in
 * the database and returned to the client.
 *
 * Body: { city?, zipCode?, priceMin?, priceMax?, propertyType? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for DB writes (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    const body = await request.json().catch(() => ({}));
    const {
      city = 'berlin',
      zipCode,
      priceMin,
      priceMax,
      propertyType,
    } = body as {
      city?: string;
      zipCode?: string;
      priceMin?: number;
      priceMax?: number;
      propertyType?: string;
    };

    // Fetch live results from all platforms
    const scrapedProperties = await searchAllPlatforms({
      city,
      zipCode,
      priceMin,
      priceMax,
      propertyType,
    });

    if (scrapedProperties.length === 0) {
      return NextResponse.json({ properties: [], count: 0 });
    }

    // Upsert scraped properties into the database
    const upsertedIds: string[] = [];
    for (const prop of scrapedProperties) {
      const record = scrapedToDbRecord(prop);
      const { data, error } = await serviceClient
        .from('properties')
        .upsert(record, { onConflict: 'source_platform,source_id' })
        .select('id')
        .single();

      if (data && !error) {
        upsertedIds.push(data.id);
      }
    }

    // Fetch the full property records that were just upserted
    if (upsertedIds.length > 0) {
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .in('id', upsertedIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        properties: properties ?? [],
        count: properties?.length ?? 0,
        sources: {
          total: scrapedProperties.length,
          stored: upsertedIds.length,
        },
      });
    }

    // If upsert failed (e.g. RLS), return scraped data directly as Property-like objects
    const directProperties = scrapedProperties.map((prop, i) => ({
      id: `scraped-${prop.source_id}-${i}`,
      ...prop,
      description_ai: null,
      is_active: true,
      scraped_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    return NextResponse.json({
      properties: directProperties,
      count: directProperties.length,
      sources: {
        total: scrapedProperties.length,
        stored: 0,
        direct: true,
      },
    });
  } catch (error) {
    console.error('[API /properties/search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function scrapedToDbRecord(prop: ScrapedProperty) {
  return {
    source_platform: prop.source_platform,
    source_url: prop.source_url,
    source_id: prop.source_id,
    title: prop.title,
    price: prop.price,
    living_area: prop.living_area,
    plot_area: prop.plot_area,
    rooms: prop.rooms,
    year_built: prop.year_built,
    property_type: prop.property_type,
    zip_code: prop.zip_code,
    city: prop.city,
    state: prop.state,
    description_original: prop.description_original,
    images: prop.images,
    is_erbpacht: prop.is_erbpacht,
    is_denkmalschutz: prop.is_denkmalschutz,
    is_provisionsfrei: prop.is_provisionsfrei,
    hausgeld: prop.hausgeld,
    energy_data: prop.energy_data,
    is_active: true,
    scraped_at: new Date().toISOString(),
  };
}

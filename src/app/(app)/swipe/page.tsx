'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Property, SwipeDirection, Region } from '@/types';
import SwipeStack from '@/components/swipe/SwipeStack';

const DAILY_SWIPE_LIMIT = 10;

function ShimmerSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 mx-4 mt-2 mb-2">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
          <div className="h-6 w-32 bg-dark-lighter/60 rounded-lg animate-shimmer" />
          <div className="h-4 w-48 bg-dark-lighter/40 rounded-lg animate-shimmer" />
          <div className="flex gap-3">
            <div className="h-7 w-16 bg-dark-lighter/40 rounded-full animate-shimmer" />
            <div className="h-7 w-20 bg-dark-lighter/40 rounded-full animate-shimmer" />
            <div className="h-7 w-18 bg-dark-lighter/40 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center gap-6 py-4 pb-safe">
        <div className="w-16 h-16 rounded-full bg-dark-lighter animate-shimmer" />
        <div className="w-20 h-20 rounded-full bg-dark-lighter animate-shimmer" />
      </div>
    </div>
  );
}

function LimitOverlay() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="text-7xl animate-flame-pulse">🔥</div>
      <h2 className="text-2xl font-bold text-cream leading-tight">
        Genug geflirtet fuer heute.
      </h2>
      <p className="text-cream/60 text-base leading-relaxed max-w-xs">
        Morgen warten neue Objekte auf dich. Bis dahin kannst du deine Likes durchstoebern.
      </p>
      <div className="mt-4 px-6 py-3 rounded-2xl bg-dark-lighter border border-cream/10">
        <p className="text-cream/40 text-sm">
          Taegliches Limit: {DAILY_SWIPE_LIMIT} Swipes erreicht
        </p>
      </div>
    </div>
  );
}

// Check if a property's zip code matches any of the user's region filters
function matchesRegionFilter(property: Property, regions: Region[]): boolean {
  if (!regions || regions.length === 0) return true;

  for (const region of regions) {
    // PLZ-based matching: check if the property zip starts with the same prefix
    // (for radius approximation) or exact match
    if (region.plz) {
      const regionPlz = region.plz;
      const propertyPlz = property.zip_code;

      if (!propertyPlz) continue;

      // Exact match
      if (propertyPlz === regionPlz) return true;

      // Approximate radius matching via PLZ prefix
      // German PLZ zones: first 1-2 digits define large regions
      // radius_km < 20: exact match only (first 4 digits)
      // radius_km < 50: first 3 digits match
      // radius_km < 100: first 2 digits match
      // radius_km >= 100: first digit match
      if (region.radius_km <= 15) {
        // Very close: first 4 digits must match
        if (propertyPlz.substring(0, 4) === regionPlz.substring(0, 4)) return true;
      } else if (region.radius_km <= 30) {
        // Close: first 3 digits must match
        if (propertyPlz.substring(0, 3) === regionPlz.substring(0, 3)) return true;
      } else if (region.radius_km <= 60) {
        // Medium: first 2 digits must match
        if (propertyPlz.substring(0, 2) === regionPlz.substring(0, 2)) return true;
      } else {
        // Wide: first digit must match
        if (propertyPlz.substring(0, 1) === regionPlz.substring(0, 1)) return true;
      }
    }

    // City-based matching
    if (region.city) {
      const regionCity = region.city.toLowerCase().trim();
      const propertyCity = (property.city || '').toLowerCase().trim();
      if (propertyCity === regionCity) return true;
      // Partial match for city names (e.g. "Frankfurt" matches "Frankfurt am Main")
      if (propertyCity.includes(regionCity) || regionCity.includes(propertyCity)) return true;
    }
  }

  return false;
}

export default function SwipePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Stable supabase client reference
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Get today's date string for swipe counting
  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Fetch user, swipe count, and properties
  useEffect(() => {
    async function init() {
      setIsLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUserId(user.id);

      const today = getTodayString();

      // Fetch today's swipe count
      const { count } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('swiped_at', `${today}T00:00:00`)
        .lt('swiped_at', `${today}T23:59:59.999`);

      const todaySwipes = count ?? 0;
      setSwipeCount(todaySwipes);

      // If already at limit, don't fetch properties
      if (todaySwipes >= DAILY_SWIPE_LIMIT) {
        setIsLoading(false);
        return;
      }

      // Fetch IDs of already-swiped properties
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('property_id')
        .eq('user_id', user.id);

      const swipedIds = (swipedData ?? []).map((s) => s.property_id);

      // Fetch user preferences for matching
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Build property query
      let query = supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50); // Fetch more to allow client-side region filtering

      // Exclude already-swiped properties
      if (swipedIds.length > 0) {
        query = query.not('id', 'in', `(${swipedIds.join(',')})`);
      }

      // Apply preference filters if available
      if (prefs) {
        if (prefs.budget_min > 0) {
          query = query.gte('price', prefs.budget_min);
        }
        if (prefs.budget_max > 0) {
          query = query.lte('price', prefs.budget_max);
        }
        if (prefs.property_types?.length > 0) {
          query = query.in('property_type', prefs.property_types);
        }

        // Filter no-gos at the DB level
        const noGos: string[] = prefs.no_gos || [];
        if (noGos.includes('erbpacht')) {
          query = query.eq('is_erbpacht', false);
        }
        if (noGos.includes('denkmalschutz')) {
          query = query.eq('is_denkmalschutz', false);
        }
      }

      const { data: propertyData } = await query;
      let filtered = propertyData ?? [];

      // Client-side region/PLZ filtering (Supabase can't do geo-radius on PLZ)
      if (prefs?.regions && prefs.regions.length > 0) {
        const regions = prefs.regions as Region[];
        filtered = filtered.filter((p) => matchesRegionFilter(p as Property, regions));
      }

      // Ensure images is always an array
      const sanitized = filtered.map((p) => ({
        ...p,
        images: Array.isArray(p.images) ? p.images : [],
      }));

      setProperties(sanitized as Property[]);
      setIsLoading(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle swipe action
  const handleSwipe = useCallback(
    async (propertyId: string, direction: SwipeDirection) => {
      if (!userId) return;

      const newCount = swipeCount + 1;
      setSwipeCount(newCount);

      // Insert swipe record
      const swipeData = {
        user_id: userId,
        property_id: propertyId,
        direction,
        swiped_at: new Date().toISOString(),
      };

      // Try insert first (most common case: first swipe on this property)
      const { error: insertError } = await supabase
        .from('swipes')
        .insert(swipeData);

      if (insertError) {
        // If duplicate, try upsert to update direction
        if (insertError.message.includes('duplicate') || insertError.code === '23505') {
          await supabase.from('swipes').upsert(
            swipeData,
            { onConflict: 'user_id,property_id' }
          );
        } else {
          console.error('Failed to save swipe:', insertError.message);
        }
      }
    },
    [userId, swipeCount, supabase]
  );

  const handleStackEmpty = useCallback(() => {
    // Could trigger fetching more properties here
  }, []);

  const remainingSwipes = Math.max(0, DAILY_SWIPE_LIMIT - swipeCount);
  const isAtLimit = swipeCount >= DAILY_SWIPE_LIMIT;

  return (
    <div className="flex flex-col h-[100dvh] bg-dark">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 pt-safe-top py-3">
        <h1 className="text-lg font-bold text-cream">
          Rendito <span className="text-coral">Swipe</span>
        </h1>
        {!isLoading && !isAtLimit && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-lighter border border-cream/10">
            <span className="text-coral text-sm">🔥</span>
            <span className="text-cream/70 text-sm font-medium animate-counter-up">
              Noch {remainingSwipes} {remainingSwipes === 1 ? 'Date' : 'Dates'} heute
            </span>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {isLoading ? (
          <ShimmerSkeleton />
        ) : isAtLimit ? (
          <LimitOverlay />
        ) : (
          <SwipeStack
            properties={properties}
            onSwipe={handleSwipe}
            onStackEmpty={handleStackEmpty}
          />
        )}
      </main>
    </div>
  );
}

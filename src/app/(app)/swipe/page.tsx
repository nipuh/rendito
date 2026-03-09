'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Property, SwipeDirection } from '@/types';
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

export default function SwipePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

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

      // Fetch user preferences for basic matching
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
        .limit(20);

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
      }

      const { data: propertyData } = await query;
      setProperties(propertyData ?? []);
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
      const { error } = await supabase.from('swipes').upsert(
        {
          user_id: userId,
          property_id: propertyId,
          direction,
          swiped_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,property_id' }
      );

      if (error) {
        console.error('Failed to save swipe:', error.message);
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

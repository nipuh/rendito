'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Property } from '@/types';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'area_desc';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const sortLabels: Record<SortOption, string> = {
  newest: 'Neueste zuerst',
  price_asc: 'Preis aufsteigend',
  price_desc: 'Preis absteigend',
  area_desc: 'Groesste zuerst',
};

export default function LikesPage() {
  const [properties, setProperties] = useState<(Property & { swiped_at: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const supabase = createClient();

  useEffect(() => {
    async function fetchLikes() {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Step 1: Fetch liked swipes
      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('property_id, swiped_at')
        .eq('user_id', user.id)
        .eq('direction', 'like')
        .order('swiped_at', { ascending: false });

      if (swipesError) {
        console.error('Fehler beim Laden der Likes:', swipesError);
        setError(
          swipesError.code === 'PGRST204' || swipesError.message?.includes('404') || swipesError.code === '42P01'
            ? 'Datenbank-Tabellen nicht gefunden. Bitte stelle sicher, dass die Datenbank korrekt eingerichtet ist.'
            : `Fehler beim Laden der Likes: ${swipesError.message}`
        );
        setIsLoading(false);
        return;
      }

      if (!swipes || swipes.length === 0) {
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch the corresponding properties
      const propertyIds = swipes.map((s) => s.property_id);
      const { data: propertyData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .in('id', propertyIds);

      if (propertiesError) {
        console.error('Fehler beim Laden der Properties:', propertiesError);
        setError(`Fehler beim Laden der Immobilien: ${propertiesError.message}`);
        setIsLoading(false);
        return;
      }

      if (!propertyData) {
        setIsLoading(false);
        return;
      }

      // Step 3: Merge swipe timestamps with property data
      const propertyMap = new Map(propertyData.map((p) => [p.id, p as Property]));
      const mapped = swipes
        .filter((s) => propertyMap.has(s.property_id))
        .map((s) => ({
          ...propertyMap.get(s.property_id)!,
          swiped_at: s.swiped_at as string,
        }));

      setProperties(mapped);
      setIsLoading(false);
    }

    fetchLikes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedProperties = [...properties].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.swiped_at).getTime() - new Date(a.swiped_at).getTime();
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'area_desc':
        return (b.living_area ?? 0) - (a.living_area ?? 0);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark/90 backdrop-blur-xl border-b border-cream/5">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-cream">
            Deine <span className="text-coral">Matches</span>
          </h1>
          <p className="text-cream/40 text-sm mt-0.5">
            {properties.length > 0
              ? `${properties.length} ${properties.length === 1 ? 'Objekt hat' : 'Objekte haben'} dein Herz erobert`
              : 'Hier landen deine Favoriten'}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : properties.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Sort controls */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-thin">
              {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    sortBy === option
                      ? 'bg-coral/20 text-coral border border-coral/30'
                      : 'bg-dark-lighter text-cream/50 border border-cream/5 hover:border-cream/15'
                  }`}
                >
                  {sortLabels[option]}
                </button>
              ))}
            </div>

            {/* Property grid */}
            <div className="grid grid-cols-2 gap-3">
              {sortedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const images = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
  const firstImage = images[0];

  return (
    <Link
      href={`/likes/${property.id}`}
      className="group block rounded-2xl overflow-hidden bg-dark-light border border-cream/5 hover:border-coral/20 transition-all duration-200 hover:shadow-lg hover:shadow-coral/5"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-dark-lighter">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">🏠</span>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-dark/80 backdrop-blur-sm">
          <span className="text-cream text-xs font-bold">
            {formatPrice(property.price)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-cream/90 text-sm font-medium truncate">
          {property.city}
        </p>
        <div className="flex items-center gap-2 text-cream/40 text-xs">
          {property.living_area && (
            <span>{property.living_area} m&sup2;</span>
          )}
          {property.living_area && property.rooms && (
            <span className="text-cream/20">|</span>
          )}
          {property.rooms && (
            <span>{property.rooms} Zi.</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 gap-5">
      <div className="text-6xl">⚠️</div>
      <h2 className="text-xl font-bold text-cream">
        Verbindungsproblem
      </h2>
      <p className="text-cream/50 text-sm leading-relaxed max-w-xs">
        {message}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary mt-2"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 gap-5">
      <div className="text-6xl">💔</div>
      <h2 className="text-xl font-bold text-cream">
        Noch keine Matches
      </h2>
      <p className="text-cream/50 text-sm leading-relaxed max-w-xs">
        Swipe los und finde deine Rendite. Dein perfektes Investment wartet schon auf dich.
      </p>
      <Link
        href="/swipe"
        className="btn-primary mt-2"
      >
        Jetzt swipen
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-dark-light border border-cream/5">
          <div className="aspect-[4/3] shimmer" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-20 bg-dark-lighter rounded-lg animate-shimmer" />
            <div className="h-3 w-16 bg-dark-lighter/60 rounded-lg animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

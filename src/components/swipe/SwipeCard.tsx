'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { Property, SwipeDirection } from '@/types';

interface SwipeCardProps {
  property: Property;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
  stackIndex: number;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const formatArea = (area: number) => `${area} m²`;

const propertyTypeLabels: Record<string, string> = {
  wohnung: 'Wohnung',
  einfamilienhaus: 'Einfamilienhaus',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  grundstueck: 'Grundstück',
  gewerbe: 'Gewerbe',
};

// --- Smart Overlay Logic ---
interface OverlayBadge {
  text: string;
  color: 'green' | 'gold' | 'coral' | 'blue';
  icon: string;
}

function getSmartOverlays(property: Property): OverlayBadge[] {
  const badges: OverlayBadge[] = [];

  // Provisionsfrei
  if (property.is_provisionsfrei) {
    badges.push({ text: 'Provisionsfrei', color: 'green', icon: '✓' });
  }

  // Low price per sqm
  if (property.living_area && property.price) {
    const pricePerSqm = property.price / property.living_area;
    if (pricePerSqm < 1500) {
      badges.push({ text: `${Math.round(pricePerSqm)} €/m² – Top Preis!`, color: 'gold', icon: '💎' });
    } else if (pricePerSqm < 2500) {
      badges.push({ text: `${Math.round(pricePerSqm)} €/m²`, color: 'green', icon: '📊' });
    }
  }

  // Mehrfamilienhaus = Renditeobjekt
  if (property.property_type === 'mehrfamilienhaus') {
    badges.push({ text: 'Renditeobjekt', color: 'gold', icon: '💰' });
  }

  // Good Faktor (price / estimated rent)
  if (property.living_area && property.price) {
    const estimatedRent = property.living_area * 8; // rough estimate 8€/sqm
    const faktor = property.price / (estimatedRent * 12);
    if (faktor < 15) {
      badges.push({ text: `Faktor ${faktor.toFixed(1)} – Stark!`, color: 'gold', icon: '🔥' });
    } else if (faktor < 20) {
      badges.push({ text: `Faktor ~${faktor.toFixed(0)}`, color: 'green', icon: '📈' });
    }
  }

  // Erbpacht warning
  if (property.is_erbpacht) {
    badges.push({ text: 'Erbpacht', color: 'coral', icon: '⚠️' });
  }

  // Denkmalschutz – can be interesting for tax benefits
  if (property.is_denkmalschutz) {
    badges.push({ text: 'Denkmalschutz-AfA möglich', color: 'blue', icon: '🏛️' });
  }

  return badges.slice(0, 3); // max 3 overlays
}

const badgeColorMap: Record<string, string> = {
  green: 'bg-green-500/80 border-green-400/50',
  gold: 'bg-amber-500/80 border-amber-400/50',
  coral: 'bg-coral/80 border-coral-light/50',
  blue: 'bg-blue-500/80 border-blue-400/50',
};

// --- Location advantages extraction ---
function extractLocationAdvantages(property: Property): string[] {
  const advantages: string[] = [];
  const text = `${property.description_original || ''} ${property.description_ai || ''}`.toLowerCase();

  const patterns: [RegExp, string][] = [
    [/(?:zentral|innenstadtn|stadtzentrum|city|fußgängerzone)/, '🏙️ Zentrale Lage'],
    [/(?:ruhig|ruhige lage|idyllisch|naturnahe?)/, '🌿 Ruhige Lage'],
    [/(?:u-bahn|s-bahn|straßenbahn|tram|haltestelle|öpnv|bus|bahnhof|nahverkehr)/, '🚇 ÖPNV-Anbindung'],
    [/(?:schule|kita|kindergarten|gymnasium)/, '🎓 Schulen & Kitas in der Nähe'],
    [/(?:einkauf|supermarkt|nahversorg|geschäfte|laden)/, '🛒 Nahversorgung'],
    [/(?:park|grünfläche|wald|see|fluss|natur|garten)/, '🌳 Grünflächen & Natur'],
    [/(?:autobahn|a\d+|auffahrt|anbindung)/, '🚗 Gute Verkehrsanbindung'],
    [/(?:universit|uni |hochschul|campus)/, '🎓 Uni-Nähe'],
    [/(?:balkon|terrasse|loggia)/, '☀️ Balkon/Terrasse'],
    [/(?:garage|stellplatz|tiefgarage|parkplatz|carport)/, '🅿️ Parkplatz/Garage'],
    [/(?:aufzug|fahrstuhl|lift)/, '🛗 Aufzug'],
    [/(?:neubau|erstbezug|kernsaniert|modernisiert|saniert)/, '✨ Modernisiert/Saniert'],
    [/(?:fußboden|parkett|fliesen|vinyl)/, '🏠 Hochwertige Böden'],
    [/(?:einbauküche|ebk)/, '🍳 Einbauküche'],
  ];

  for (const [regex, label] of patterns) {
    if (regex.test(text)) {
      advantages.push(label);
    }
  }

  return advantages.slice(0, 8);
}

export default function SwipeCard({ property, onSwipe, isTop, stackIndex }: SwipeCardProps) {
  const [dragState, setDragState] = useState({ x: 0, y: 0, isDragging: false });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Image swipe state
  const imgSwipeRef = useRef({ startX: 0, startY: 0, isSwiping: false, startTime: 0 });
  const [imgSwipeOffset, setImgSwipeOffset] = useState(0);

  const SWIPE_THRESHOLD = 100;
  const IMG_SWIPE_THRESHOLD = 40;

  const images = useMemo(() => Array.isArray(property.images) ? property.images.filter(Boolean) : [], [property.images]);
  const overlays = useMemo(() => getSmartOverlays(property), [property]);
  const locationAdvantages = useMemo(() => extractLocationAdvantages(property), [property]);
  const totalImages = images.length;

  // --- Card drag handlers ---
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!isTop || isExpanded) return;
    startPos.current = { x: clientX, y: clientY };
    setDragState({ x: 0, y: 0, isDragging: true });
  }, [isTop, isExpanded]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    setDragState({ x: deltaX, y: deltaY, isDragging: true });
  }, [dragState.isDragging]);

  const handleEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    if (Math.abs(dragState.x) > SWIPE_THRESHOLD) {
      const direction: SwipeDirection = dragState.x > 0 ? 'like' : 'nope';
      setIsAnimatingOut(true);
      setTimeout(() => {
        onSwipe(direction);
      }, 300);
    } else {
      setDragState({ x: 0, y: 0, isDragging: false });
    }
  }, [dragState, onSwipe]);

  // Touch handlers for card
  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = () => handleEnd();

  // Mouse handlers for card
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => {
    if (dragState.isDragging) handleEnd();
  };

  // --- Image swipe handlers (for expanded gallery) ---
  const handleImgSwipeStart = useCallback((clientX: number, clientY: number) => {
    imgSwipeRef.current = { startX: clientX, startY: clientY, isSwiping: true, startTime: Date.now() };
    setImgSwipeOffset(0);
  }, []);

  const handleImgSwipeMove = useCallback((clientX: number, clientY: number) => {
    if (!imgSwipeRef.current.isSwiping) return;
    const deltaX = clientX - imgSwipeRef.current.startX;
    const deltaY = clientY - imgSwipeRef.current.startY;
    // Only horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setImgSwipeOffset(deltaX);
    }
  }, []);

  const handleImgSwipeEnd = useCallback(() => {
    if (!imgSwipeRef.current.isSwiping) return;
    imgSwipeRef.current.isSwiping = false;
    const elapsed = Date.now() - imgSwipeRef.current.startTime;
    const velocity = Math.abs(imgSwipeOffset) / Math.max(elapsed, 1);

    if (Math.abs(imgSwipeOffset) > IMG_SWIPE_THRESHOLD || velocity > 0.5) {
      if (imgSwipeOffset > 0 && activeImageIndex > 0) {
        setActiveImageIndex((prev) => prev - 1);
      } else if (imgSwipeOffset < 0 && activeImageIndex < totalImages - 1) {
        setActiveImageIndex((prev) => prev + 1);
      }
    }
    setImgSwipeOffset(0);
  }, [imgSwipeOffset, activeImageIndex, totalImages]);

  // Programmatic swipe for buttons
  const triggerSwipe = useCallback((direction: SwipeDirection) => {
    const targetX = direction === 'like' ? 400 : -400;
    setDragState({ x: targetX, y: 0, isDragging: false });
    setIsAnimatingOut(true);
    setTimeout(() => onSwipe(direction), 300);
  }, [onSwipe]);

  // Expose triggerSwipe via ref-like pattern
  if (isTop && cardRef.current) {
    (cardRef.current as HTMLDivElement & { triggerSwipe?: (d: SwipeDirection) => void }).triggerSwipe = triggerSwipe;
  }

  const rotation = dragState.x * 0.1;
  const opacity = Math.max(0, 1 - Math.abs(dragState.x) / 400);

  // Tint overlays
  const likeOpacity = Math.min(1, Math.max(0, dragState.x / SWIPE_THRESHOLD) * 0.5);
  const nopeOpacity = Math.min(1, Math.max(0, -dragState.x / SWIPE_THRESHOLD) * 0.5);

  const cardStyle: React.CSSProperties = isTop
    ? {
        transform: `translateX(${dragState.x}px) translateY(${dragState.y * 0.3}px) rotate(${rotation}deg)`,
        transition: dragState.isDragging ? 'none' : isAnimatingOut ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'transform 0.4s ease-out',
        opacity: isAnimatingOut ? 0 : opacity < 0.3 ? opacity : 1,
        zIndex: 30,
        cursor: 'grab',
      }
    : {
        transform: `scale(${1 - stackIndex * 0.04}) translateY(${stackIndex * 8}px)`,
        zIndex: 30 - stackIndex,
        pointerEvents: 'none' as const,
      };

  const mainImage = images[activeImageIndex] || images[0];

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 rounded-card overflow-hidden select-none"
      style={cardStyle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      data-trigger-swipe={isTop ? 'true' : undefined}
    >
      <div className={`relative w-full h-full bg-dark-light rounded-card border border-cream/5 shadow-2xl overflow-hidden ${isExpanded ? 'overflow-y-auto' : ''}`}>
        {/* Main Image Section */}
        <div className={`relative ${isExpanded ? 'h-72' : 'h-full'} w-full flex-shrink-0`}>
          {mainImage ? (
            <Image
              src={mainImage}
              alt={property.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              priority={isTop}
            />
          ) : (
            <div className="w-full h-full bg-dark-lighter flex items-center justify-center">
              <span className="text-cream/30 text-4xl">🏠</span>
            </div>
          )}

          {/* Like tint overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent to-green-500/40 pointer-events-none rounded-card"
            style={{ opacity: likeOpacity }}
          />
          {/* Nope tint overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-red-500/40 to-transparent pointer-events-none rounded-card"
            style={{ opacity: nopeOpacity }}
          />

          {/* Like/Nope labels */}
          {isTop && dragState.x > 30 && (
            <div className="absolute top-8 left-6 px-4 py-2 border-2 border-green-400 rounded-xl rotate-[-15deg] z-10">
              <span className="text-green-400 font-bold text-2xl tracking-wider">LIKE</span>
            </div>
          )}
          {isTop && dragState.x < -30 && (
            <div className="absolute top-8 right-6 px-4 py-2 border-2 border-red-400 rounded-xl rotate-[15deg] z-10">
              <span className="text-red-400 font-bold text-2xl tracking-wider">NOPE</span>
            </div>
          )}

          {/* Image counter badge */}
          {totalImages > 1 && (
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-dark/70 backdrop-blur-sm rounded-full text-cream/90 text-xs font-medium z-10">
              {activeImageIndex + 1} / {totalImages}
            </div>
          )}

          {/* Image pagination dots */}
          {totalImages > 1 && (
            <div className="absolute top-4 left-0 right-16 flex justify-center gap-1 z-10">
              {images.slice(0, 12).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === activeImageIndex ? 'w-6 bg-cream' : 'w-2 bg-cream/40'
                  }`}
                />
              ))}
              {totalImages > 12 && (
                <div className="w-2 h-1 rounded-full bg-cream/20" />
              )}
            </div>
          )}

          {/* Smart Overlay Badges */}
          {overlays.length > 0 && (
            <div className="absolute top-12 left-4 flex flex-col gap-1.5 z-10">
              {overlays.map((badge, i) => (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold text-white border backdrop-blur-md shadow-lg ${badgeColorMap[badge.color]}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {badge.icon} {badge.text}
                </div>
              ))}
            </div>
          )}

          {/* Tap zones for image nav */}
          {!isExpanded && totalImages > 1 && (
            <>
              <div
                className="absolute top-0 left-0 w-1/3 h-3/4 z-[5]"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => Math.max(0, prev - 1));
                }}
              />
              <div
                className="absolute top-0 right-0 w-1/3 h-3/4 z-[5]"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) =>
                    Math.min(totalImages - 1, prev + 1)
                  );
                }}
              />
            </>
          )}

          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-dark/95 via-dark/60 to-transparent pointer-events-none" />

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <h3 className="text-xl font-bold text-cream leading-tight mb-1 drop-shadow-lg">
              {formatPrice(property.price)}
            </h3>
            <p className="text-cream/70 text-sm font-medium mb-3">
              {property.city} · {property.zip_code}
            </p>
            <div className="flex gap-3 text-sm">
              {property.living_area && (
                <span className="px-3 py-1 bg-cream/10 backdrop-blur-sm rounded-full text-cream/90">
                  {formatArea(property.living_area)}
                </span>
              )}
              {property.rooms && (
                <span className="px-3 py-1 bg-cream/10 backdrop-blur-sm rounded-full text-cream/90">
                  {property.rooms} Zimmer
                </span>
              )}
              {property.year_built && (
                <span className="px-3 py-1 bg-cream/10 backdrop-blur-sm rounded-full text-cream/90">
                  Bj. {property.year_built}
                </span>
              )}
            </div>

            {/* Expand toggle */}
            {!isExpanded && (
              <button
                className="mt-3 w-full flex items-center justify-center py-1 text-cream/40 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
              >
                <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="ml-1">Mehr erfahren</span>
              </button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="p-5 space-y-5 bg-dark-light">
            {/* Collapse button */}
            <button
              className="w-full flex items-center justify-center py-1 text-cream/40 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="ml-1">Weniger anzeigen</span>
            </button>

            {/* Title */}
            <h2 className="text-lg font-bold text-cream">{property.title}</h2>

            {/* Swipeable Image Gallery */}
            {totalImages > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-coral uppercase tracking-wider">
                  Bilder ({totalImages})
                </h4>
                <div
                  className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden touch-pan-y"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleImgSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    handleImgSwipeMove(e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    handleImgSwipeEnd();
                  }}
                >
                  <div
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{
                      width: `${totalImages * 100}%`,
                      transform: `translateX(calc(-${(activeImageIndex * 100) / totalImages}% + ${imgSwipeOffset}px))`,
                      transition: imgSwipeRef.current.isSwiping ? 'none' : 'transform 0.3s ease-out',
                    }}
                  >
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative h-full flex-shrink-0"
                        style={{ width: `${100 / totalImages}%` }}
                      >
                        <Image
                          src={img}
                          alt={`${property.title} - Bild ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Gallery navigation arrows */}
                  {activeImageIndex > 0 && (
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-dark/60 backdrop-blur-sm rounded-full flex items-center justify-center text-cream/80 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => prev - 1);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {activeImageIndex < totalImages - 1 && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-dark/60 backdrop-blur-sm rounded-full flex items-center justify-center text-cream/80 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => prev + 1);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  {/* Gallery counter */}
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-dark/70 backdrop-blur-sm rounded-full text-cream/90 text-xs font-medium z-10">
                    {activeImageIndex + 1} / {totalImages}
                  </div>
                </div>

                {/* Thumbnail strip */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        i === activeImageIndex
                          ? 'border-coral shadow-md shadow-coral/20'
                          : 'border-transparent opacity-60 hover:opacity-80'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(i);
                      }}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location Advantages */}
            {locationAdvantages.length > 0 && (
              <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl p-4 border border-cream/5 space-y-3">
                <h4 className="text-sm font-semibold text-coral uppercase tracking-wider">Lage & Vorteile</h4>
                <div className="flex flex-wrap gap-2">
                  {locationAdvantages.map((advantage, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-cream/5 border border-cream/10 rounded-full text-cream/80 text-xs font-medium"
                    >
                      {advantage}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fact Box */}
            <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl p-4 border border-cream/5 space-y-3">
              <h4 className="text-sm font-semibold text-coral uppercase tracking-wider">Fakten</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <FactRow label="Preis" value={formatPrice(property.price)} />
                <FactRow label="Typ" value={propertyTypeLabels[property.property_type] || property.property_type} />
                {property.living_area && <FactRow label="Wohnfläche" value={formatArea(property.living_area)} />}
                {property.plot_area && <FactRow label="Grundstück" value={formatArea(property.plot_area)} />}
                {property.rooms && <FactRow label="Zimmer" value={`${property.rooms}`} />}
                {property.year_built && <FactRow label="Baujahr" value={`${property.year_built}`} />}
                <FactRow label="PLZ / Ort" value={`${property.zip_code} ${property.city}`} />
                {property.state && <FactRow label="Bundesland" value={property.state} />}
                {property.hausgeld && <FactRow label="Hausgeld" value={formatPrice(property.hausgeld) + '/Monat'} />}
                {property.is_provisionsfrei && <FactRow label="Provision" value="Provisionsfrei ✓" highlight />}
                {property.is_erbpacht && <FactRow label="Erbpacht" value="Ja ⚠️" warn />}
                {property.is_denkmalschutz && <FactRow label="Denkmalschutz" value="Ja ⚠️" warn />}
              </div>
            </div>

            {/* Price Analysis Overlay */}
            {property.living_area && property.price && (
              <div className="bg-gradient-to-r from-dark-lighter/80 to-dark-lighter/40 backdrop-blur-sm rounded-2xl p-4 border border-coral/20 space-y-2">
                <h4 className="text-sm font-semibold text-coral uppercase tracking-wider">Schnell-Analyse</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-cream/40 text-xs">Preis pro m²</span>
                    <span className="font-bold text-cream">{Math.round(property.price / property.living_area).toLocaleString('de-DE')} €/m²</span>
                  </div>
                  {(() => {
                    const estimatedRent = property.living_area * 8;
                    const faktor = property.price / (estimatedRent * 12);
                    return (
                      <>
                        <div className="flex flex-col">
                          <span className="text-cream/40 text-xs">Geschätzter Faktor</span>
                          <span className={`font-bold ${faktor < 20 ? 'text-green-400' : faktor < 25 ? 'text-amber-400' : 'text-red-400'}`}>
                            {faktor.toFixed(1)}x
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-cream/40 text-xs">Gesch. Bruttomiete</span>
                          <span className="font-medium text-cream/80">{formatPrice(estimatedRent)}/Mon.</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-cream/40 text-xs">Bruttorendite (gesch.)</span>
                          <span className={`font-bold ${(1 / faktor * 100) > 5 ? 'text-green-400' : (1 / faktor * 100) > 3.5 ? 'text-amber-400' : 'text-cream/80'}`}>
                            {(1 / faktor * 100).toFixed(1)}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* AI Description */}
            {property.description_ai && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-coral uppercase tracking-wider flex items-center gap-2">
                  <span>✨</span> KI-Zusammenfassung
                </h4>
                <p className="text-cream/70 text-sm leading-relaxed whitespace-pre-line">{property.description_ai}</p>
              </div>
            )}

            {/* Original Description */}
            {property.description_original && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-cream/50 uppercase tracking-wider">Inserat-Beschreibung</h4>
                <p className="text-cream/60 text-sm leading-relaxed whitespace-pre-line">{property.description_original}</p>
              </div>
            )}

            {/* Fallback if no descriptions at all */}
            {!property.description_ai && !property.description_original && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-cream/50 uppercase tracking-wider">Beschreibung</h4>
                <p className="text-cream/40 text-sm italic">Keine Beschreibung verfuegbar.</p>
              </div>
            )}

            {/* Source platform link */}
            {property.source_url && (
              <div className="pt-2">
                <a
                  href={property.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-lighter border border-cream/10 rounded-xl text-cream/70 text-sm hover:border-coral/30 hover:text-coral transition-all"
                >
                  <span>🔗</span>
                  <span>Originalinserat auf {property.source_platform === 'immoscout24' ? 'ImmoScout24' : property.source_platform === 'immowelt' ? 'Immowelt' : 'Kleinanzeigen'} ansehen</span>
                </a>
              </div>
            )}

            {/* Bottom padding for safe area */}
            <div className="h-24" />
          </div>
        )}
      </div>
    </div>
  );
}

function FactRow({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-cream/40 text-xs">{label}</span>
      <span className={`font-medium ${warn ? 'text-amber-400' : highlight ? 'text-green-400' : 'text-cream/90'}`}>
        {value}
      </span>
    </div>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';
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

export default function SwipeCard({ property, onSwipe, isTop, stackIndex }: SwipeCardProps) {
  const [dragState, setDragState] = useState({ x: 0, y: 0, isDragging: false });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;

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

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = () => handleEnd();

  // Mouse handlers
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

  const mainImage = property.images?.[activeImageIndex] || property.images?.[0];

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

          {/* Image pagination dots */}
          {property.images?.length > 1 && (
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-10">
              {property.images.slice(0, 8).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === activeImageIndex ? 'w-6 bg-cream' : 'w-2 bg-cream/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Tap zones for image nav */}
          {!isExpanded && property.images?.length > 1 && (
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
                    Math.min((property.images?.length ?? 1) - 1, prev + 1)
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

            {/* AI Description */}
            {property.description_ai && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-coral uppercase tracking-wider flex items-center gap-2">
                  <span>✨</span> KI-Zusammenfassung
                </h4>
                <p className="text-cream/70 text-sm leading-relaxed">{property.description_ai}</p>
              </div>
            )}

            {/* Original Description */}
            {property.description_original && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-cream/50 uppercase tracking-wider">Beschreibung</h4>
                <p className="text-cream/50 text-sm leading-relaxed line-clamp-6">{property.description_original}</p>
              </div>
            )}

            {/* Additional Images */}
            {property.images?.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-coral uppercase tracking-wider">Bilder</h4>
                <div className="grid grid-cols-2 gap-2">
                  {property.images.slice(1, 7).map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden">
                      <Image
                        src={img}
                        alt={`${property.title} - Bild ${i + 2}`}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    </div>
                  ))}
                </div>
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

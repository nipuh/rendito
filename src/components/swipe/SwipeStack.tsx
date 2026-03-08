'use client';

import { useState, useCallback, useRef } from 'react';
import type { Property, SwipeDirection } from '@/types';
import SwipeCard from './SwipeCard';
import SwipeButtons from './SwipeButtons';
import MatchOverlay from './MatchOverlay';

interface SwipeStackProps {
  properties: Property[];
  onSwipe: (propertyId: string, direction: SwipeDirection) => void;
  onStackEmpty: () => void;
}

export default function SwipeStack({ properties, onSwipe, onStackEmpty }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      const property = properties[currentIndex];
      if (!property) return;

      onSwipe(property.id, direction);

      if (direction === 'like') {
        setShowMatch(true);
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex >= properties.length) {
        setTimeout(() => onStackEmpty(), 400);
      }
      setCurrentIndex(nextIndex);
    },
    [currentIndex, properties, onSwipe, onStackEmpty]
  );

  const handleButtonSwipe = useCallback(
    (direction: SwipeDirection) => {
      // Find the top card and trigger its programmatic swipe
      if (cardContainerRef.current) {
        const topCard = cardContainerRef.current.querySelector('[data-trigger-swipe="true"]') as
          | (HTMLDivElement & { triggerSwipe?: (d: SwipeDirection) => void })
          | null;
        if (topCard?.triggerSwipe) {
          topCard.triggerSwipe(direction);
          return;
        }
      }
      // Fallback: direct swipe
      handleSwipe(direction);
    },
    [handleSwipe]
  );

  const handleMatchDismiss = useCallback(() => {
    setShowMatch(false);
  }, []);

  const remainingProperties = properties.slice(currentIndex);
  const isStackEmpty = currentIndex >= properties.length;

  if (isStackEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
        <div className="text-6xl">🏠</div>
        <h2 className="text-xl font-bold text-cream">
          Keine neuen Objekte mehr
        </h2>
        <p className="text-cream/50 text-sm leading-relaxed">
          Du hast alle verfuegbaren Immobilien gesehen. Schau spaeter nochmal vorbei -- es kommen staendig neue Objekte rein!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Card stack area */}
      <div ref={cardContainerRef} className="relative flex-1 mx-4 mt-2 mb-2">
        {remainingProperties.slice(0, 3).map((property, index) => (
          <SwipeCard
            key={property.id}
            property={property}
            onSwipe={handleSwipe}
            isTop={index === 0}
            stackIndex={index}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 pb-safe">
        <SwipeButtons onSwipe={handleButtonSwipe} disabled={isStackEmpty} />
      </div>

      {/* Match overlay */}
      <MatchOverlay visible={showMatch} onDismiss={handleMatchDismiss} />
    </div>
  );
}

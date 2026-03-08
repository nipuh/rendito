'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PropertyImagesProps {
  images: string[];
  alt?: string;
}

export default function PropertyImages({ images, alt = 'Immobilie' }: PropertyImagesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightbox, setIsLightbox] = useState(false);

  const hasImages = images && images.length > 0;
  const currentImage = hasImages ? images[activeIndex] : null;

  return (
    <>
      {/* Main Image */}
      <div
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-dark-lighter cursor-pointer group"
        onClick={() => hasImages && setIsLightbox(true)}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={`${alt} - Bild ${activeIndex + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 600px"
            priority
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl opacity-30">🏠</span>
            <span className="text-cream/30 text-sm">Kein Bild vorhanden</span>
          </div>
        )}

        {/* Image counter badge */}
        {hasImages && images.length > 1 && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-dark/70 backdrop-blur-sm text-cream/80 text-xs font-medium">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasImages && images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIndex
                  ? 'border-coral shadow-lg shadow-coral/20'
                  : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <Image
                src={img}
                alt={`${alt} - Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {isLightbox && currentImage && (
        <div
          className="fixed inset-0 z-[100] bg-dark/95 backdrop-blur-xl flex flex-col items-center justify-center"
          onClick={() => setIsLightbox(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-dark-lighter/80 flex items-center justify-center text-cream/70 hover:text-cream transition-colors"
            onClick={() => setIsLightbox(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Main lightbox image */}
          <div className="relative w-full max-w-3xl aspect-[4/3] mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={currentImage}
              alt={`${alt} - Bild ${activeIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-dark-lighter/80 flex items-center justify-center text-cream/70 hover:text-cream transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-dark-lighter/80 flex items-center justify-center text-cream/70 hover:text-cream transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev + 1) % images.length);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Counter */}
          <div className="mt-4 text-cream/50 text-sm">
            {activeIndex + 1} von {images.length}
          </div>
        </div>
      )}
    </>
  );
}

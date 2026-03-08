'use client';

import type { SwipeDirection } from '@/types';

interface SwipeButtonsProps {
  onSwipe: (direction: SwipeDirection) => void;
  disabled?: boolean;
}

export default function SwipeButtons({ onSwipe, disabled }: SwipeButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      {/* Nope Button */}
      <button
        onClick={() => onSwipe('nope')}
        disabled={disabled}
        className="group relative w-16 h-16 rounded-full bg-dark-lighter border-2 border-cream/10
                   hover:border-red-400/50 hover:bg-red-500/10
                   active:scale-90 transition-all duration-200
                   disabled:opacity-40 disabled:pointer-events-none
                   flex items-center justify-center shadow-lg"
        aria-label="Nope"
      >
        <svg
          className="w-7 h-7 text-cream/60 group-hover:text-red-400 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <div className="absolute inset-0 rounded-full opacity-0 group-active:opacity-100 bg-red-500/20 transition-opacity" />
      </button>

      {/* Like Button */}
      <button
        onClick={() => onSwipe('like')}
        disabled={disabled}
        className="group relative w-20 h-20 rounded-full bg-flame-gradient
                   hover:bg-flame-gradient-hover
                   active:scale-90 transition-all duration-200
                   disabled:opacity-40 disabled:pointer-events-none
                   flex items-center justify-center shadow-lg shadow-coral/30"
        aria-label="Like"
      >
        <svg
          className="w-9 h-9 text-cream transition-transform group-hover:scale-110"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12.001 4.529c2.349-2.109 5.979-2.039 8.242.228 2.262 2.268 2.34 5.88.236 8.236l-8.48 8.492-8.478-8.492c-2.104-2.356-2.025-5.974.236-8.236 2.265-2.264 5.888-2.34 8.244-.228z" />
        </svg>
        <div className="absolute inset-0 rounded-full opacity-0 group-active:opacity-100 bg-cream/10 transition-opacity" />
      </button>
    </div>
  );
}

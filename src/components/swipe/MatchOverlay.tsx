'use client';

import { useEffect, useState } from 'react';

const MATCH_MESSAGES = [
  'Da knistert\'s! 🔥',
  'Hot Deal entdeckt. 💎',
  'Das könnte was werden! 💘',
  'Love auf den ersten Blick! 😍',
  'Volltreffer! 🎯',
  'Die Chemie stimmt! ✨',
  'Match made in Immobilien-Himmel! 🏠',
  'Das riecht nach Rendite! 💰',
];

interface MatchOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function MatchOverlay({ visible, onDismiss }: MatchOverlayProps) {
  const [message, setMessage] = useState('');
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (visible) {
      const randomMessage = MATCH_MESSAGES[Math.floor(Math.random() * MATCH_MESSAGES.length)];
      setMessage(randomMessage);
      setIsShowing(true);

      const timer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onDismiss, 300);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible && !isShowing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-coral/10 via-berry/20 to-dark/80" />

      {/* Content */}
      <div
        className={`relative flex flex-col items-center gap-6 transition-all duration-500 ${
          isShowing ? 'scale-100 translate-y-0' : 'scale-75 translate-y-8'
        }`}
      >
        {/* Flame animation */}
        <div className="relative">
          <div className="text-8xl animate-flame-pulse drop-shadow-2xl">🔥</div>
          {/* Glow ring */}
          <div className="absolute inset-0 -m-4 rounded-full bg-coral/20 blur-2xl animate-flame-pulse" />
        </div>

        {/* Match message */}
        <div className="text-center px-8">
          <p className="text-2xl font-bold text-cream animate-slide-up drop-shadow-lg">
            {message}
          </p>
        </div>

        {/* Sparkle particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gold rounded-full animate-flame-pulse"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 0.2}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

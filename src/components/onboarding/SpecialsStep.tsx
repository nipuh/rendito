'use client';

import type { Special } from '@/types';

interface SpecialsStepProps {
  selected: Special[];
  onChange: (specials: Special[]) => void;
}

const SPECIALS: { value: Special; label: string; emoji: string }[] = [
  { value: 'zwangsversteigerung', label: 'Zwangsversteigerung', emoji: '⚖️' },
  { value: 'teilungsversteigerung', label: 'Teilungsversteigerung', emoji: '✂️' },
  { value: 'nachlassverkauf', label: 'Nachlassverkauf', emoji: '📜' },
  { value: 'bankenverwertung', label: 'Bankenverwertung', emoji: '🏦' },
  { value: 'sondereigentum', label: 'Sondereigentum', emoji: '🔑' },
];

export default function SpecialsStep({ selected, onChange }: SpecialsStepProps) {
  const toggle = (special: Special) => {
    if (selected.includes(special)) {
      onChange(selected.filter((s) => s !== special));
    } else {
      onChange([...selected, special]);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-cream">Stehst du auf was Besonderes?</h2>
        <p className="text-cream/50">Spezialfalle konnen echte Schnappchen sein. Auch optional.</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {SPECIALS.map(({ value, label, emoji }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`
                inline-flex items-center gap-2 px-5 py-3 rounded-full
                border transition-all duration-300 text-sm font-medium
                ${
                  isSelected
                    ? 'bg-coral/10 border-coral/50 text-cream shadow-lg shadow-coral/10'
                    : 'bg-dark-light/80 border-cream/5 text-cream/60 hover:border-cream/15 hover:text-cream'
                }
              `}
            >
              <span>{emoji}</span>
              {label}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-cream/30">
        Kein Muss – aber wer suchet, der findet.
      </p>
    </div>
  );
}

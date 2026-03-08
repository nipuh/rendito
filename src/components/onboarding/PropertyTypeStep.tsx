'use client';

import type { PropertyType } from '@/types';

interface PropertyTypeStepProps {
  selected: PropertyType[];
  onChange: (types: PropertyType[]) => void;
}

const TYPES: { value: PropertyType; label: string; emoji: string }[] = [
  { value: 'wohnung', label: 'Wohnung', emoji: '🏢' },
  { value: 'einfamilienhaus', label: 'Einfamilienhaus', emoji: '🏠' },
  { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus', emoji: '🏘' },
  { value: 'grundstueck', label: 'Grundstuck', emoji: '🌳' },
  { value: 'gewerbe', label: 'Gewerbe', emoji: '🏭' },
];

export default function PropertyTypeStep({ selected, onChange }: PropertyTypeStepProps) {
  const toggle = (type: PropertyType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-cream">Was ist dein Typ?</h2>
        <p className="text-cream/50">Welche Immobilienarten bringen dein Herz zum Schlagen?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ value, label, emoji }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`
                relative p-5 rounded-card text-center transition-all duration-300
                border backdrop-blur-sm
                ${
                  isSelected
                    ? 'bg-coral/10 border-coral/50 shadow-lg shadow-coral/10'
                    : 'bg-dark-light/80 border-cream/5 hover:border-cream/15'
                }
                ${value === 'gewerbe' ? 'col-span-2' : ''}
              `}
            >
              <span className="text-3xl block mb-2">{emoji}</span>
              <p className="text-sm font-semibold text-cream">{label}</p>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-coral flex items-center justify-center">
                  <svg className="w-3 h-3 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

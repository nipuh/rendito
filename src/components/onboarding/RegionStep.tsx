'use client';

import { useState } from 'react';
import type { Region } from '@/types';

interface RegionStepProps {
  regions: Region[];
  onChange: (regions: Region[]) => void;
}

export default function RegionStep({ regions, onChange }: RegionStepProps) {
  const [input, setInput] = useState('');
  const [radius, setRadius] = useState(25);

  const addRegion = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const isPlz = /^\d{5}$/.test(trimmed);
    const newRegion: Region = {
      ...(isPlz ? { plz: trimmed } : { city: trimmed }),
      radius_km: radius,
    };

    onChange([...regions, newRegion]);
    setInput('');
    setRadius(25);
  };

  const removeRegion = (index: number) => {
    onChange(regions.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRegion();
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-cream">Wo soll&apos;s knistern?</h2>
        <p className="text-cream/50">Gib eine PLZ oder Stadt ein. Du kannst mehrere Regionen hinzufugen.</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="PLZ oder Stadt eingeben..."
          className="input-field"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream/50">Umkreis</span>
            <span className="text-coral font-semibold">{radius} km</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-cream/30">
            <span>10 km</span>
            <span>100 km</span>
          </div>
        </div>

        <button
          onClick={addRegion}
          disabled={!input.trim()}
          className={`
            w-full py-3 rounded-xl font-semibold transition-all duration-200
            ${
              input.trim()
                ? 'bg-dark-lighter border border-coral/30 text-coral hover:bg-coral/10'
                : 'bg-dark-lighter border border-cream/5 text-cream/20 cursor-not-allowed'
            }
          `}
        >
          + Region hinzufugen
        </button>
      </div>

      {regions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-cream/40">Deine Regionen:</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((region, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                           bg-coral/10 border border-coral/30 text-cream text-sm"
              >
                {region.plz || region.city} ({region.radius_km} km)
                <button
                  onClick={() => removeRegion(i)}
                  className="w-4 h-4 rounded-full bg-cream/10 hover:bg-cream/20
                             flex items-center justify-center text-cream/60 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

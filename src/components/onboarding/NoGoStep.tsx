'use client';

import type { NoGo } from '@/types';

interface NoGoStepProps {
  selected: NoGo[];
  onChange: (nogos: NoGo[]) => void;
}

const NO_GOS: { value: NoGo; label: string; desc: string }[] = [
  { value: 'erbpacht', label: 'Erbpacht', desc: 'Grundstuck gehort dir nicht' },
  { value: 'denkmalschutz', label: 'Denkmalschutz', desc: 'Auflagen bei Umbau & Sanierung' },
  { value: 'erbbaurecht', label: 'Erbbaurecht', desc: 'Zeitlich begrenztes Nutzungsrecht' },
  { value: 'sanierungsstau', label: 'Sanierungsstau', desc: 'Hoher Investitionsbedarf' },
];

export default function NoGoStep({ selected, onChange }: NoGoStepProps) {
  const toggle = (nogo: NoGo) => {
    if (selected.includes(nogo)) {
      onChange(selected.filter((n) => n !== nogo));
    } else {
      onChange([...selected, nogo]);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-cream">Absolute Dealbreaker?</h2>
        <p className="text-cream/50">Was geht gar nicht? Alles optional – kein Urteil hier.</p>
      </div>

      <div className="grid gap-3">
        {NO_GOS.map(({ value, label, desc }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`
                w-full flex items-center justify-between p-4 rounded-xl
                border transition-all duration-300
                ${
                  isSelected
                    ? 'bg-coral/10 border-coral/50'
                    : 'bg-dark-light/80 border-cream/5 hover:border-cream/15'
                }
              `}
            >
              <div className="text-left">
                <p className="font-semibold text-cream">{label}</p>
                <p className="text-xs text-cream/40">{desc}</p>
              </div>
              <div
                className={`
                  w-10 h-6 rounded-full relative transition-all duration-300
                  ${isSelected ? 'bg-coral' : 'bg-dark-lighter'}
                `}
              >
                <div
                  className={`
                    absolute top-0.5 w-5 h-5 rounded-full bg-cream shadow-sm
                    transition-all duration-300
                    ${isSelected ? 'left-[18px]' : 'left-0.5'}
                  `}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-cream/30">
        Du kannst das spater jederzeit andern.
      </p>
    </div>
  );
}

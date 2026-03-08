'use client';

import type { InvestmentGoal } from '@/types';

interface InvestmentGoalStepProps {
  selected: InvestmentGoal[];
  onChange: (goals: InvestmentGoal[]) => void;
}

const GOALS: { value: InvestmentGoal; label: string; emoji: string; desc: string }[] = [
  {
    value: 'fix_flip',
    label: 'Fix & Flip',
    emoji: '🔨',
    desc: 'Kaufen, aufhubschen, weiterverkaufen.',
  },
  {
    value: 'eigenbezug',
    label: 'Eigenbezug',
    emoji: '🏡',
    desc: 'Dein neues Zuhause wartet.',
  },
  {
    value: 'kapitalanlage',
    label: 'Kapitalanlage',
    emoji: '💰',
    desc: 'Cashflow und Vermogensaufbau.',
  },
];

export default function InvestmentGoalStep({ selected, onChange }: InvestmentGoalStepProps) {
  const toggle = (goal: InvestmentGoal) => {
    if (selected.includes(goal)) {
      onChange(selected.filter((g) => g !== goal));
    } else {
      onChange([...selected, goal]);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-cream">Was ist dein Plan?</h2>
        <p className="text-cream/50">Sag uns, worauf du stehst. Mehrfachauswahl erlaubt.</p>
      </div>

      <div className="grid gap-4">
        {GOALS.map(({ value, label, emoji, desc }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`
                relative w-full text-left p-5 rounded-card transition-all duration-300
                border backdrop-blur-sm
                ${
                  isSelected
                    ? 'bg-coral/10 border-coral/50 shadow-lg shadow-coral/10'
                    : 'bg-dark-light/80 border-cream/5 hover:border-cream/15'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{emoji}</span>
                <div>
                  <p className="text-lg font-semibold text-cream">{label}</p>
                  <p className="text-sm text-cream/40">{desc}</p>
                </div>
                <div
                  className={`
                    ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300
                    ${isSelected ? 'border-coral bg-coral' : 'border-cream/20'}
                  `}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

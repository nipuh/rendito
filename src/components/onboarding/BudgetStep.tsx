'use client';

interface BudgetStepProps {
  budgetMin: number;
  budgetMax: number;
  onChange: (min: number, max: number) => void;
}

const MIN_BOUND = 50_000;
const MAX_BOUND = 2_000_000;
const STEP = 10_000;

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BudgetStep({ budgetMin, budgetMax, onChange }: BudgetStepProps) {
  const handleMinChange = (val: number) => {
    onChange(Math.min(val, budgetMax - STEP), budgetMax);
  };

  const handleMaxChange = (val: number) => {
    onChange(budgetMin, Math.max(val, budgetMin + STEP));
  };

  // Calculate filled track position as percentages
  const minPercent = ((budgetMin - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100;
  const maxPercent = ((budgetMax - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-cream">Was darfst du dir leisten?</h2>
        <p className="text-cream/50">Setz dein Budget. Sei ehrlich zu dir selbst.</p>
      </div>

      <div className="card-glass p-6 space-y-8">
        {/* Display values */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-cream/40 mb-1">Minimum</p>
            <p className="text-xl font-bold text-coral">{formatEuro(budgetMin)}</p>
          </div>
          <div className="text-cream/20 text-2xl">—</div>
          <div className="text-center">
            <p className="text-xs text-cream/40 mb-1">Maximum</p>
            <p className="text-xl font-bold text-coral">{formatEuro(budgetMax)}</p>
          </div>
        </div>

        {/* Range track visualization */}
        <div className="relative h-2 rounded-full bg-dark-lighter">
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-coral to-berry"
            style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
          />
        </div>

        {/* Min slider */}
        <div className="space-y-1">
          <label className="text-sm text-cream/40">Mindestpreis</label>
          <input
            type="range"
            min={MIN_BOUND}
            max={MAX_BOUND}
            step={STEP}
            value={budgetMin}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Max slider */}
        <div className="space-y-1">
          <label className="text-sm text-cream/40">Hochstpreis</label>
          <input
            type="range"
            min={MIN_BOUND}
            max={MAX_BOUND}
            step={STEP}
            value={budgetMax}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-between text-xs text-cream/30">
          <span>{formatEuro(MIN_BOUND)}</span>
          <span>{formatEuro(MAX_BOUND)}</span>
        </div>
      </div>
    </div>
  );
}

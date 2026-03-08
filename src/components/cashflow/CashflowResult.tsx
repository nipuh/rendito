'use client';

import { useEffect, useRef, useState } from 'react';
import type { CashflowResult } from '@/types';

interface CashflowResultProps {
  result: CashflowResult;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' %';

const formatFaktor = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const statusConfig = {
  hot: {
    label: 'Hot Deal \u2013 Cashflow positiv',
    emoji: '\uD83D\uDD25',
    color: 'text-gold',
    glowClass: 'shadow-[0_0_40px_rgba(245,200,66,0.15)]',
    borderClass: 'border-gold/20',
    bgGlow: 'bg-gold/5',
  },
  warm: {
    label: 'Warm \u2013 knapp \u00fcber Null',
    emoji: '',
    color: 'text-coral',
    glowClass: 'shadow-[0_0_40px_rgba(232,98,124,0.15)]',
    borderClass: 'border-coral/20',
    bgGlow: 'bg-coral/5',
  },
  cold: {
    label: 'Kalt \u2013 hier stimmt die Chemie noch nicht',
    emoji: '',
    color: 'text-cream/50',
    glowClass: 'shadow-[0_0_20px_rgba(255,245,240,0.05)]',
    borderClass: 'border-cream/10',
    bgGlow: 'bg-cream/5',
  },
} as const;

function AnimatedValue({ value, children }: { value: number; children: React.ReactNode }) {
  const [displayKey, setDisplayKey] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setDisplayKey((k) => k + 1);
      prevValue.current = value;
    }
  }, [value]);

  return (
    <span key={displayKey} className="inline-block animate-counter-up">
      {children}
    </span>
  );
}

export default function CashflowResultDisplay({ result }: CashflowResultProps) {
  const config = statusConfig[result.status];

  const metrics = [
    { label: 'Monatliche Rate', value: result.monatliche_rate, format: formatCurrency },
    { label: 'Bruttomietrendite', value: result.bruttomietrendite, format: formatPercent },
    { label: 'Nettomietrendite', value: result.nettomietrendite, format: formatPercent },
    { label: 'Eigenkapitalrendite', value: result.eigenkapitalrendite, format: formatPercent },
    { label: 'Faktor', value: result.faktor, format: formatFaktor },
  ];

  return (
    <div
      className={`rounded-card border ${config.borderClass} ${config.glowClass} ${config.bgGlow} backdrop-blur-xl p-6 space-y-5 transition-all duration-500`}
    >
      {/* Main Cashflow Number */}
      <div className="text-center space-y-2">
        <p className="text-cream/50 text-sm font-medium uppercase tracking-wider">
          Monatlicher Cashflow
        </p>
        <div className={`font-mono text-4xl font-bold ${config.color} transition-colors duration-500`}>
          <AnimatedValue value={result.monatlicher_cashflow}>
            {formatCurrency(result.monatlicher_cashflow)}
          </AnimatedValue>
        </div>
        <p className={`text-sm font-medium ${config.color} transition-colors duration-500`}>
          {config.emoji ? `${config.emoji} ` : ''}{config.label}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-cream/5" />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-1">
            <p className="text-cream/40 text-xs font-medium uppercase tracking-wider">
              {metric.label}
            </p>
            <p className="font-mono text-lg font-semibold text-cream/90 transition-all duration-300">
              <AnimatedValue value={metric.value}>
                {metric.format(metric.value)}
              </AnimatedValue>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

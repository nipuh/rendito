'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Property, CashflowInputs, CashflowResult } from '@/types';
import { GRUNDERWERBSTEUER, NOTAR_GRUNDBUCH_PROZENT, MAKLER_PROZENT } from '@/types';
import { createClient } from '@/lib/supabase/client';
import CashflowResultDisplay from './CashflowResult';

interface CashflowCalculatorProps {
  property: Property;
  initialInputs?: CashflowInputs;
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  formatDisplay?: (v: number) => string;
}

function SliderInput({ label, value, onChange, min, max, step, suffix, formatDisplay }: SliderInputProps) {
  const displayValue = formatDisplay ? formatDisplay(value) : value.toString();
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-cream/70 text-sm font-medium">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={parseFloat(value.toFixed(4))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            min={min}
            max={max}
            step={step}
            className="w-24 bg-dark-lighter border border-cream/10 rounded-lg px-2 py-1.5 text-right font-mono text-sm text-cream/90 focus:outline-none focus:border-coral/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-cream/40 text-xs font-mono w-8">{suffix}</span>
        </div>
      </div>
      <div className="relative h-6 flex items-center group">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-dark-lighter overflow-hidden">
          <div
            className="h-full rounded-full bg-flame-gradient transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-coral border-2 border-cream/20 shadow-lg pointer-events-none transition-all duration-150 group-hover:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
}

function calculateResults(inputs: CashflowInputs, property: Property): CashflowResult {
  const price = property.price;
  const livingArea = property.living_area ?? 0;
  const stateKey = property.state?.toLowerCase().replace(/\s+/g, '-') ?? '';
  const grunderwerbsteuerSatz = GRUNDERWERBSTEUER[stateKey] ?? 6;
  const nebenkostenProzent = grunderwerbsteuerSatz + NOTAR_GRUNDBUCH_PROZENT + MAKLER_PROZENT;
  const nebenkosten = price * nebenkostenProzent / 100;

  const darlehensbetrag = price + nebenkosten - inputs.eigenkapital;
  const monatliche_rate = darlehensbetrag * (inputs.zinssatz + inputs.tilgung) / 100 / 12;

  const jahresmiete = inputs.geschaetzte_miete * 12;
  const instandhaltung_monatlich = inputs.instandhaltung_per_sqm * livingArea / 12;
  const mietausfall_monatlich = inputs.geschaetzte_miete * inputs.mietausfall_prozent / 100;

  const monatlicher_cashflow =
    inputs.geschaetzte_miete -
    monatliche_rate -
    instandhaltung_monatlich -
    inputs.hausgeld_extra -
    mietausfall_monatlich;

  const bruttomietrendite = jahresmiete > 0 ? (jahresmiete / price) * 100 : 0;

  const jahreskosten = instandhaltung_monatlich * 12 + inputs.hausgeld_extra * 12 + mietausfall_monatlich * 12;
  const nettomietrendite =
    price + nebenkosten > 0
      ? ((jahresmiete - jahreskosten) / (price + nebenkosten)) * 100
      : 0;

  const tilgung_anteil_jahr = darlehensbetrag * inputs.tilgung / 100;
  const eigenkapitalrendite =
    inputs.eigenkapital > 0
      ? ((monatlicher_cashflow * 12 + tilgung_anteil_jahr) / inputs.eigenkapital) * 100
      : 0;

  const faktor = jahresmiete > 0 ? price / jahresmiete : 0;

  let status: CashflowResult['status'];
  if (monatlicher_cashflow > 50) status = 'hot';
  else if (monatlicher_cashflow > -50) status = 'warm';
  else status = 'cold';

  return {
    monatliche_rate,
    monatlicher_cashflow,
    bruttomietrendite,
    nettomietrendite,
    eigenkapitalrendite,
    faktor,
    status,
  };
}

export default function CashflowCalculator({ property, initialInputs }: CashflowCalculatorProps) {
  const livingArea = property.living_area ?? 0;
  const defaultMiete = Math.round(livingArea * 5);

  const [inputs, setInputs] = useState<CashflowInputs>(
    initialInputs ?? {
      user_id: '',
      property_id: property.id,
      eigenkapital: Math.round(property.price * 0.2),
      zinssatz: 3.5,
      tilgung: 2,
      laufzeit: 30,
      geschaetzte_miete: defaultMiete,
      instandhaltung_per_sqm: 10,
      hausgeld_extra: property.hausgeld ?? 0,
      mietausfall_prozent: 2,
    }
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToSupabase = useCallback(
    (updatedInputs: CashflowInputs) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const payload = { ...updatedInputs, user_id: user.id, property_id: property.id };
          delete (payload as Record<string, unknown>).id;

          await supabase.from('cashflow_inputs').upsert(payload, {
            onConflict: 'user_id,property_id',
          });
        } catch {
          // silently fail on save errors
        }
      }, 1000);
    },
    [property.id]
  );

  const updateInput = useCallback(
    <K extends keyof CashflowInputs>(key: K, value: CashflowInputs[K]) => {
      setInputs((prev) => {
        const next = { ...prev, [key]: value };
        saveToSupabase(next);
        return next;
      });
    },
    [saveToSupabase]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const result = useMemo(() => calculateResults(inputs, property), [inputs, property]);

  // Nebenkosten display
  const stateKey = property.state?.toLowerCase().replace(/\s+/g, '-') ?? '';
  const grunderwerbsteuerSatz = GRUNDERWERBSTEUER[stateKey] ?? 6;
  const nebenkostenProzent = grunderwerbsteuerSatz + NOTAR_GRUNDBUCH_PROZENT + MAKLER_PROZENT;
  const nebenkosten = property.price * nebenkostenProzent / 100;

  const formatEuro = (v: number) =>
    new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl animate-flame-pulse">&#x1F525;</span>
        <h2 className="text-2xl font-bold text-cream">Der Renditocheck</h2>
      </div>

      {/* Nebenkosten Summary */}
      <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl p-4 border border-cream/5 space-y-2">
        <h4 className="text-xs font-semibold text-cream/40 uppercase tracking-wider">
          Kaufnebenkosten (automatisch)
        </h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-cream/40">Grunderwerbsteuer</span>
            <p className="font-mono text-cream/70">{grunderwerbsteuerSatz.toFixed(1)} %</p>
          </div>
          <div>
            <span className="text-cream/40">Notar & Grundbuch</span>
            <p className="font-mono text-cream/70">{NOTAR_GRUNDBUCH_PROZENT.toFixed(1)} %</p>
          </div>
          <div>
            <span className="text-cream/40">Makler</span>
            <p className="font-mono text-cream/70">{MAKLER_PROZENT.toFixed(2)} %</p>
          </div>
        </div>
        <div className="pt-1 border-t border-cream/5 flex justify-between items-center">
          <span className="text-cream/50 text-xs">Gesamt ({nebenkostenProzent.toFixed(2)} %)</span>
          <span className="font-mono text-sm text-coral font-semibold">
            {formatEuro(nebenkosten)} &euro;
          </span>
        </div>
      </div>

      {/* Input Sliders */}
      <div className="bg-dark-lighter/40 backdrop-blur-sm rounded-card p-5 border border-cream/5 space-y-5">
        <SliderInput
          label="Eigenkapital"
          value={inputs.eigenkapital}
          onChange={(v) => updateInput('eigenkapital', v)}
          min={0}
          max={property.price}
          step={1000}
          suffix="\u20AC"
          formatDisplay={(v) => formatEuro(v)}
        />

        <SliderInput
          label="Zinssatz"
          value={inputs.zinssatz}
          onChange={(v) => updateInput('zinssatz', v)}
          min={0.5}
          max={8}
          step={0.1}
          suffix="%"
        />

        <SliderInput
          label="Tilgung"
          value={inputs.tilgung}
          onChange={(v) => updateInput('tilgung', v)}
          min={0.5}
          max={5}
          step={0.1}
          suffix="%"
        />

        <SliderInput
          label="Laufzeit"
          value={inputs.laufzeit}
          onChange={(v) => updateInput('laufzeit', v)}
          min={5}
          max={40}
          step={1}
          suffix="J."
        />

        <SliderInput
          label="Gesch\u00E4tzte Kaltmiete"
          value={inputs.geschaetzte_miete}
          onChange={(v) => updateInput('geschaetzte_miete', v)}
          min={0}
          max={Math.max(5000, inputs.geschaetzte_miete * 2)}
          step={10}
          suffix="\u20AC/M"
        />

        <SliderInput
          label="Instandhaltungsr\u00FCcklage"
          value={inputs.instandhaltung_per_sqm}
          onChange={(v) => updateInput('instandhaltung_per_sqm', v)}
          min={0}
          max={30}
          step={0.5}
          suffix="\u20AC/m\u00B2"
        />

        <SliderInput
          label="Hausgeld / nicht umlegbare Kosten"
          value={inputs.hausgeld_extra}
          onChange={(v) => updateInput('hausgeld_extra', v)}
          min={0}
          max={1000}
          step={10}
          suffix="\u20AC/M"
        />

        <SliderInput
          label="Mietausfallrisiko"
          value={inputs.mietausfall_prozent}
          onChange={(v) => updateInput('mietausfall_prozent', v)}
          min={0}
          max={10}
          step={0.5}
          suffix="%"
        />
      </div>

      {/* Results */}
      <CashflowResultDisplay result={result} />
    </div>
  );
}

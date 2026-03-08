'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  InvestmentGoal,
  PropertyType,
  NoGo,
  Special,
  Region,
  UserPreferences,
} from '@/types';

const INVESTMENT_GOAL_LABELS: Record<InvestmentGoal, string> = {
  fix_flip: 'Fix & Flip',
  eigenbezug: 'Eigenbezug',
  kapitalanlage: 'Kapitalanlage',
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  wohnung: 'Wohnung',
  einfamilienhaus: 'Einfamilienhaus',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  grundstueck: 'Grundstueck',
  gewerbe: 'Gewerbe',
};

const NOGO_LABELS: Record<NoGo, string> = {
  erbpacht: 'Erbpacht',
  denkmalschutz: 'Denkmalschutz',
  erbbaurecht: 'Erbbaurecht',
  sanierungsstau: 'Sanierungsstau',
};

const SPECIAL_LABELS: Record<Special, string> = {
  zwangsversteigerung: 'Zwangsversteigerung',
  teilungsversteigerung: 'Teilungsversteigerung',
  nachlassverkauf: 'Nachlassverkauf',
  bankenverwertung: 'Bankenverwertung',
  sondereigentum: 'Sondereigentum',
};

const ALL_GOALS: InvestmentGoal[] = ['fix_flip', 'eigenbezug', 'kapitalanlage'];
const ALL_PROPERTY_TYPES: PropertyType[] = ['wohnung', 'einfamilienhaus', 'mehrfamilienhaus', 'grundstueck', 'gewerbe'];
const ALL_NOGOS: NoGo[] = ['erbpacht', 'denkmalschutz', 'erbbaurecht', 'sanierungsstau'];
const ALL_SPECIALS: Special[] = ['zwangsversteigerung', 'teilungsversteigerung', 'nachlassverkauf', 'bankenverwertung', 'sondereigentum'];

const formatEuro = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Preference state
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [budgetMin, setBudgetMin] = useState(100_000);
  const [budgetMax, setBudgetMax] = useState(500_000);
  const [noGos, setNoGos] = useState<NoGo[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);

  // Region input
  const [regionInput, setRegionInput] = useState('');
  const [regionRadius, setRegionRadius] = useState(25);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      setEmail(user.email || '');

      // Load preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        const p = prefs as UserPreferences;
        setInvestmentGoals(p.investment_goals || []);
        setRegions(p.regions || []);
        setPropertyTypes(p.property_types || []);
        setBudgetMin(p.budget_min || 100_000);
        setBudgetMax(p.budget_max || 500_000);
        setNoGos(p.no_gos || []);
        setSpecials(p.specials || []);
      }

      setIsLoading(false);
    }

    loadData();
  }, [router]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          investment_goals: investmentGoals,
          regions,
          property_types: propertyTypes,
          budget_min: budgetMin,
          budget_max: budgetMax,
          no_gos: noGos,
          specials,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [investmentGoals, regions, propertyTypes, budgetMin, budgetMax, noGos, specials]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleInArray = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const addRegion = () => {
    const trimmed = regionInput.trim();
    if (!trimmed) return;
    const isPlz = /^\d{5}$/.test(trimmed);
    const newRegion: Region = {
      ...(isPlz ? { plz: trimmed } : { city: trimmed }),
      radius_km: regionRadius,
    };
    setRegions((prev) => [...prev, newRegion]);
    setRegionInput('');
    setRegionRadius(25);
  };

  const removeRegion = (index: number) => {
    setRegions((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="sticky top-0 z-40 bg-dark/90 backdrop-blur-xl border-b border-cream/5">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="h-6 w-32 bg-dark-lighter rounded-lg animate-shimmer" />
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark/90 backdrop-blur-xl border-b border-cream/5">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-cream">
            Dein <span className="text-coral">Profil</span>
          </h1>
          <p className="text-cream/40 text-sm mt-0.5">Einstellungen und Praeferenzen</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Account Section */}
        <section className="card-glass p-5 space-y-3">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">Konto</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-flame-gradient flex items-center justify-center">
              <span className="text-cream font-bold text-lg">
                {email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-cream/90 text-sm font-medium truncate">{email}</p>
              <p className="text-cream/40 text-xs">Dein Login</p>
            </div>
          </div>
        </section>

        {/* Investment Goals */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">
            Anlagestrategie
          </h2>
          <div className="flex flex-wrap gap-2">
            {ALL_GOALS.map((goal) => (
              <ChipToggle
                key={goal}
                label={INVESTMENT_GOAL_LABELS[goal]}
                isActive={investmentGoals.includes(goal)}
                onClick={() => setInvestmentGoals((prev) => toggleInArray(prev, goal))}
              />
            ))}
          </div>
        </section>

        {/* Regions */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">Regionen</h2>

          {regions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {regions.map((region, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-coral/10 border border-coral/30 text-cream text-xs"
                >
                  {region.plz || region.city} ({region.radius_km} km)
                  <button
                    onClick={() => removeRegion(i)}
                    className="w-4 h-4 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream/60 transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRegion();
                }
              }}
              placeholder="PLZ oder Stadt..."
              className="input-field text-sm"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-cream/40">Umkreis</span>
              <span className="text-coral font-semibold">{regionRadius} km</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={regionRadius}
              onChange={(e) => setRegionRadius(Number(e.target.value))}
              className="w-full"
            />
            <button
              onClick={addRegion}
              disabled={!regionInput.trim()}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                regionInput.trim()
                  ? 'bg-dark-lighter border border-coral/30 text-coral hover:bg-coral/10'
                  : 'bg-dark-lighter border border-cream/5 text-cream/20 cursor-not-allowed'
              }`}
            >
              + Region hinzufuegen
            </button>
          </div>
        </section>

        {/* Property Types */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">
            Objekttypen
          </h2>
          <div className="flex flex-wrap gap-2">
            {ALL_PROPERTY_TYPES.map((type) => (
              <ChipToggle
                key={type}
                label={PROPERTY_TYPE_LABELS[type]}
                isActive={propertyTypes.includes(type)}
                onClick={() => setPropertyTypes((prev) => toggleInArray(prev, type))}
              />
            ))}
          </div>
        </section>

        {/* Budget */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">Budget</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-cream/40">Minimum</p>
              <p className="text-lg font-bold text-coral">{formatEuro(budgetMin)}</p>
            </div>
            <span className="text-cream/20 text-xl">—</span>
            <div className="text-right">
              <p className="text-xs text-cream/40">Maximum</p>
              <p className="text-lg font-bold text-coral">{formatEuro(budgetMax)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-cream/40">Mindestpreis</label>
              <input
                type="range"
                min={50_000}
                max={2_000_000}
                step={10_000}
                value={budgetMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBudgetMin(Math.min(v, budgetMax - 10_000));
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-cream/40">Hoechstpreis</label>
              <input
                type="range"
                min={50_000}
                max={2_000_000}
                step={10_000}
                value={budgetMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBudgetMax(Math.max(v, budgetMin + 10_000));
                }}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* No-Gos */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">No-Gos</h2>
          <p className="text-cream/40 text-xs">Das kommt fuer dich nicht in Frage.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_NOGOS.map((nogo) => (
              <ChipToggle
                key={nogo}
                label={NOGO_LABELS[nogo]}
                isActive={noGos.includes(nogo)}
                onClick={() => setNoGos((prev) => toggleInArray(prev, nogo))}
              />
            ))}
          </div>
        </section>

        {/* Specials */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-coral uppercase tracking-wider">
            Sonderfaelle
          </h2>
          <p className="text-cream/40 text-xs">Diese Spezialfaelle interessieren dich.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SPECIALS.map((special) => (
              <ChipToggle
                key={special}
                label={SPECIAL_LABELS[special]}
                isActive={specials.includes(special)}
                onClick={() => setSpecials((prev) => toggleInArray(prev, special))}
              />
            ))}
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {isSaving
            ? 'Speichern...'
            : saveStatus === 'saved'
              ? 'Gespeichert!'
              : saveStatus === 'error'
                ? 'Fehler - nochmal versuchen'
                : 'Praeferenzen speichern'}
        </button>

        {/* Logout */}
        <section className="card-glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-cream/40 uppercase tracking-wider">
            Sonstiges
          </h2>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl font-semibold text-coral/80 bg-coral/5 border border-coral/15 hover:bg-coral/10 hover:text-coral transition-all"
          >
            Ausloggen
          </button>
        </section>
      </div>
    </div>
  );
}

function ChipToggle({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
        isActive
          ? 'bg-coral/20 text-coral border border-coral/30'
          : 'bg-dark-lighter text-cream/50 border border-cream/5 hover:border-cream/15'
      }`}
    >
      {label}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { InvestmentGoal, PropertyType, NoGo, Special, Region } from '@/types';

import StepIndicator from '@/components/onboarding/StepIndicator';
import InvestmentGoalStep from '@/components/onboarding/InvestmentGoalStep';
import RegionStep from '@/components/onboarding/RegionStep';
import PropertyTypeStep from '@/components/onboarding/PropertyTypeStep';
import BudgetStep from '@/components/onboarding/BudgetStep';
import NoGoStep from '@/components/onboarding/NoGoStep';
import SpecialsStep from '@/components/onboarding/SpecialsStep';

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [budgetMin, setBudgetMin] = useState(100_000);
  const [budgetMax, setBudgetMax] = useState(500_000);
  const [noGos, setNoGos] = useState<NoGo[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return investmentGoals.length > 0;
      case 1:
        return regions.length > 0;
      case 2:
        return propertyTypes.length > 0;
      case 3:
        return budgetMin < budgetMax;
      case 4: // No-gos are optional
      case 5: // Specials are optional
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    // Last step – save to Supabase
    setSaving(true);
    setError('');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Du bist nicht eingeloggt. Bitte logge dich erneut ein.');
        setSaving(false);
        return;
      }

      // Ensure user row exists (trigger may not have fired)
      const { error: userError } = await supabase.from('users').upsert(
        { id: user.id, email: user.email ?? '' },
        { onConflict: 'id' }
      );

      if (userError) {
        console.error('User upsert error:', userError);
        setError('Fehler beim Speichern. Bitte versuche es erneut.');
        setSaving(false);
        return;
      }

      // Save user preferences – try update first, then insert
      const prefData = {
        user_id: user.id,
        investment_goals: investmentGoals,
        regions: regions,
        property_types: propertyTypes,
        budget_min: budgetMin,
        budget_max: budgetMax,
        no_gos: noGos,
        specials: specials,
      };

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error: prefError } = existing
        ? await supabase
            .from('user_preferences')
            .update(prefData)
            .eq('user_id', user.id)
        : await supabase
            .from('user_preferences')
            .insert(prefData);

      if (prefError) {
        console.error('Preferences save error:', prefError);
        setError('Fehler beim Speichern. Bitte versuche es erneut.');
        setSaving(false);
        return;
      }

      // Mark onboarding as completed
      const { error: profileError } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (profileError) {
        // Fallback: update auth user metadata
        await supabase.auth.updateUser({
          data: { onboarding_completed: true },
        });
      }

      router.push('/swipe');
    } catch (err) {
      console.error('Onboarding save error:', err);
      setError('Etwas ist schiefgelaufen. Bitte versuche es erneut.');
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <FlameIcon />
          <span className="text-xl font-bold text-cream">Rendito</span>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step content */}
        <div className="min-h-[400px] flex flex-col justify-between">
          <div key={currentStep} className="flex-1">
            {currentStep === 0 && (
              <InvestmentGoalStep selected={investmentGoals} onChange={setInvestmentGoals} />
            )}
            {currentStep === 1 && <RegionStep regions={regions} onChange={setRegions} />}
            {currentStep === 2 && (
              <PropertyTypeStep selected={propertyTypes} onChange={setPropertyTypes} />
            )}
            {currentStep === 3 && (
              <BudgetStep
                budgetMin={budgetMin}
                budgetMax={budgetMax}
                onChange={(min, max) => {
                  setBudgetMin(min);
                  setBudgetMax(max);
                }}
              />
            )}
            {currentStep === 4 && <NoGoStep selected={noGos} onChange={setNoGos} />}
            {currentStep === 5 && <SpecialsStep selected={specials} onChange={setSpecials} />}
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-coral bg-coral/10 border border-coral/20 rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <button onClick={handleBack} className="btn-secondary flex-shrink-0" disabled={saving}>
                Zurueck
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? 'Speichern...'
                : isLastStep
                  ? 'Perfekt. Lass uns dein erstes Match finden.'
                  : 'Weiter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 4 10 4 14.5C4 18.09 7.58 21 12 21C16.42 21 20 18.09 20 14.5C20 10 12 2 12 2Z"
        fill="url(#flame-gradient-onboarding)"
      />
      <path
        d="M12 21C14.21 21 16 19.21 16 17C16 14 12 9 12 9C12 9 8 14 8 17C8 19.21 9.79 21 12 21Z"
        fill="#F5C842"
        opacity="0.8"
      />
      <defs>
        <linearGradient
          id="flame-gradient-onboarding"
          x1="4"
          y1="2"
          x2="20"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E8627C" />
          <stop offset="1" stopColor="#8B1E3F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

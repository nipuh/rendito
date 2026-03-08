'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Property, CashflowInputs } from '@/types';
import PropertyImages from '@/components/property/PropertyImages';
import PropertyDetails from '@/components/property/PropertyDetails';
import CashflowCalculator from '@/components/cashflow/CashflowCalculator';

const SOURCE_LABELS: Record<string, string> = {
  immoscout24: 'ImmoScout24',
  immowelt: 'Immowelt',
  kleinanzeigen: 'Kleinanzeigen',
};

export default function LikeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [cashflowInputs, setCashflowInputs] = useState<CashflowInputs | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Bitte logge dich ein.');
        setIsLoading(false);
        return;
      }

      // Fetch property
      const { data: propertyData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (propError || !propertyData) {
        setError('Objekt nicht gefunden. Vielleicht wurde es entfernt.');
        setIsLoading(false);
        return;
      }

      setProperty(propertyData as Property);

      // Fetch existing cashflow inputs
      const { data: cfData } = await supabase
        .from('cashflow_inputs')
        .select('*')
        .eq('user_id', user.id)
        .eq('property_id', id)
        .single();

      if (cfData) {
        setCashflowInputs(cfData as CashflowInputs);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [id]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-5xl">😢</span>
        <h2 className="text-xl font-bold text-cream">{error || 'Etwas ist schiefgelaufen'}</h2>
        <Link href="/likes" className="btn-primary mt-2">
          Zurueck zu Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark/90 backdrop-blur-xl border-b border-cream/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-dark-lighter border border-cream/10 flex items-center justify-center text-cream/60 hover:text-cream transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-cream truncate">{property.title}</h1>
            <p className="text-xs text-cream/40 truncate">
              {property.zip_code} {property.city}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6 pb-24">
        {/* Images */}
        <PropertyImages images={property.images} alt={property.title} />

        {/* Property Facts */}
        <PropertyDetails property={property} />

        {/* AI Description */}
        {property.description_ai && (
          <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl p-5 border border-cream/5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-sm font-semibold text-coral uppercase tracking-wider">
                KI-Zusammenfassung
              </h3>
            </div>
            <p className="text-cream/70 text-sm leading-relaxed whitespace-pre-line">
              {property.description_ai}
            </p>
          </div>
        )}

        {/* Original Description */}
        {property.description_original && (
          <ExpandableSection title="Originalbeschreibung">
            <p className="text-cream/60 text-sm leading-relaxed whitespace-pre-line">
              {property.description_original}
            </p>
          </ExpandableSection>
        )}

        {/* Source Link */}
        <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl p-5 border border-cream/5 space-y-3">
          <h3 className="text-sm font-semibold text-coral uppercase tracking-wider">
            Quelle
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-dark-lighter flex items-center justify-center">
                <SourceIcon platform={property.source_platform} />
              </div>
              <div>
                <p className="text-cream/90 text-sm font-medium">
                  {SOURCE_LABELS[property.source_platform] || property.source_platform}
                </p>
                <p className="text-cream/40 text-xs">Originalinserat</p>
              </div>
            </div>
            <a
              href={property.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm font-medium hover:bg-coral/20 transition-colors"
            >
              Ansehen
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14L21 3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Cashflow Calculator */}
        <CashflowCalculator property={property} initialInputs={cashflowInputs} />
      </div>
    </div>
  );
}

function ExpandableSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl border border-cream/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5"
      >
        <h3 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">
          {title}
        </h3>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-cream/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function SourceIcon({ platform }: { platform: string }) {
  // Simple colored initials as platform icons
  const colors: Record<string, string> = {
    immoscout24: 'text-blue-400',
    immowelt: 'text-orange-400',
    kleinanzeigen: 'text-green-400',
  };

  const initials: Record<string, string> = {
    immoscout24: 'IS',
    immowelt: 'IW',
    kleinanzeigen: 'KA',
  };

  return (
    <span className={`text-xs font-bold ${colors[platform] || 'text-cream/50'}`}>
      {initials[platform] || '??'}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-dark">
      <header className="sticky top-0 z-40 bg-dark/90 backdrop-blur-xl border-b border-cream/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-dark-lighter animate-shimmer" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 bg-dark-lighter rounded-lg animate-shimmer" />
            <div className="h-3 w-24 bg-dark-lighter/60 rounded-lg animate-shimmer" />
          </div>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <div className="aspect-[4/3] shimmer rounded-2xl" />
        <div className="h-48 shimmer rounded-2xl" />
        <div className="h-32 shimmer rounded-2xl" />
      </div>
    </div>
  );
}

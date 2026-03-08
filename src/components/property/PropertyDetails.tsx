'use client';

import type { Property } from '@/types';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const formatArea = (area: number) =>
  `${new Intl.NumberFormat('de-DE').format(area)} m\u00B2`;

const propertyTypeLabels: Record<string, string> = {
  wohnung: 'Wohnung',
  einfamilienhaus: 'Einfamilienhaus',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  grundstueck: 'Grundstueck',
  gewerbe: 'Gewerbe',
};

interface PropertyDetailsProps {
  property: Property;
}

export default function PropertyDetails({ property }: PropertyDetailsProps) {
  return (
    <div className="bg-dark-lighter/60 backdrop-blur-sm rounded-2xl p-5 border border-cream/5 space-y-4">
      <h3 className="text-sm font-semibold text-coral uppercase tracking-wider">
        Fakten zum Objekt
      </h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <FactItem label="Kaufpreis" value={formatPrice(property.price)} highlight />
        <FactItem
          label="Objekttyp"
          value={propertyTypeLabels[property.property_type] || property.property_type}
        />

        {property.living_area != null && (
          <FactItem label="Wohnflaeche" value={formatArea(property.living_area)} />
        )}
        {property.plot_area != null && (
          <FactItem label="Grundstueck" value={formatArea(property.plot_area)} />
        )}
        {property.rooms != null && (
          <FactItem label="Zimmer" value={`${property.rooms}`} />
        )}
        {property.year_built != null && (
          <FactItem label="Baujahr" value={`${property.year_built}`} />
        )}

        <FactItem
          label="Standort"
          value={`${property.zip_code} ${property.city}`}
        />
        {property.state && (
          <FactItem label="Bundesland" value={property.state} />
        )}

        {property.hausgeld != null && (
          <FactItem label="Hausgeld" value={`${formatPrice(property.hausgeld)}/Mon.`} />
        )}

        {property.is_provisionsfrei && (
          <FactItem label="Provision" value="Provisionsfrei" badge="green" />
        )}
      </div>

      {/* Energy data */}
      {property.energy_data && Object.keys(property.energy_data).length > 0 && (
        <div className="pt-3 border-t border-cream/5 space-y-2">
          <span className="text-xs font-semibold text-cream/40 uppercase tracking-wider">
            Energiedaten
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {Object.entries(property.energy_data).map(([key, value]) => (
              <FactItem key={key} label={key} value={String(value)} />
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      {(property.is_erbpacht || property.is_denkmalschutz) && (
        <div className="flex gap-2 pt-3 border-t border-cream/5">
          {property.is_erbpacht && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Erbpacht
            </span>
          )}
          {property.is_denkmalschutz && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Denkmalschutz
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function FactItem({
  label,
  value,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: 'green' | 'amber';
}) {
  const valueColor = badge === 'green'
    ? 'text-green-400'
    : badge === 'amber'
      ? 'text-amber-400'
      : highlight
        ? 'text-cream font-semibold'
        : 'text-cream/80';

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-cream/40 text-xs">{label}</span>
      <span className={`font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

import Anthropic from '@anthropic-ai/sdk';
import type { Property } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generatePropertyDescription(property: Property): Promise<string> {
  const facts = [
    `Titel: ${property.title}`,
    `Kaufpreis: ${property.price.toLocaleString('de-DE')}€`,
    property.living_area ? `Wohnfläche: ${property.living_area}m²` : null,
    property.plot_area ? `Grundstücksfläche: ${property.plot_area}m²` : null,
    property.rooms ? `Zimmer: ${property.rooms}` : null,
    property.year_built ? `Baujahr: ${property.year_built}` : null,
    `Objektart: ${property.property_type}`,
    `Ort: ${property.zip_code} ${property.city}`,
    property.is_provisionsfrei ? 'Provisionsfrei' : null,
    property.hausgeld ? `Hausgeld: ${property.hausgeld}€/Monat` : null,
    property.description_original ? `Originalbeschreibung: ${property.description_original.slice(0, 500)}` : null,
  ].filter(Boolean).join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Erstelle einen ansprechenden, sachlichen Immobilien-Exposétext basierend auf folgenden Daten:

${facts}

Hebe die Vorteile und das Potenzial hervor. Formuliere verkaufsfördernd aber seriös. Deutsch. Max 200 Wörter. Kein Titel, nur der Fließtext.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}

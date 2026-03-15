import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, { ok: boolean; error?: string }> = {};

  // Check env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      status: 'error',
      message: 'NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt',
      tables: {},
    }, { status: 500 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({
      status: 'error',
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY ist nicht gesetzt',
      tables: {},
    }, { status: 500 });
  }

  const supabase = createServerSupabaseClient();

  // Check each table
  const tables = ['users', 'user_preferences', 'properties', 'swipes', 'cashflow_inputs'];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      results[table] = { ok: false, error: error.message };
    } else {
      results[table] = { ok: true };
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);

  return NextResponse.json({
    status: allOk ? 'ok' : 'error',
    message: allOk
      ? 'Alle Tabellen erreichbar'
      : 'Einige Tabellen sind nicht erreichbar. Bitte fuehre die Migration SQL in deinem Supabase Dashboard aus (SQL Editor > New Query > Inhalt von supabase/migrations/001_initial_schema.sql einfuegen und ausfuehren).',
    tables: results,
  }, { status: allOk ? 200 : 503 });
}

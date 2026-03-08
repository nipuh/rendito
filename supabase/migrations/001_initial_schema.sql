-- Rendito Database Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences from onboarding
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  investment_goals TEXT[] DEFAULT '{}',
  regions JSONB DEFAULT '[]',
  property_types TEXT[] DEFAULT '{}',
  budget_min INTEGER DEFAULT 50000,
  budget_max INTEGER DEFAULT 500000,
  no_gos TEXT[] DEFAULT '{}',
  specials TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties (scraped listings)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  living_area NUMERIC,
  plot_area NUMERIC,
  rooms NUMERIC,
  year_built INTEGER,
  property_type TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  description_original TEXT,
  description_ai TEXT,
  images JSONB DEFAULT '[]',
  is_erbpacht BOOLEAN DEFAULT FALSE,
  is_denkmalschutz BOOLEAN DEFAULT FALSE,
  is_provisionsfrei BOOLEAN DEFAULT FALSE,
  hausgeld NUMERIC,
  energy_data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_platform, source_id)
);

-- Swipes (user interactions with properties)
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('like', 'nope')),
  swiped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Cashflow calculator inputs
CREATE TABLE public.cashflow_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  eigenkapital NUMERIC DEFAULT 0,
  zinssatz NUMERIC DEFAULT 3.5,
  tilgung NUMERIC DEFAULT 2.0,
  laufzeit INTEGER DEFAULT 30,
  instandhaltung_per_sqm NUMERIC DEFAULT 10,
  hausgeld_extra NUMERIC DEFAULT 0,
  mietausfall_prozent NUMERIC DEFAULT 2,
  geschaetzte_miete NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Indexes
CREATE INDEX idx_properties_active ON public.properties(is_active);
CREATE INDEX idx_properties_price ON public.properties(price);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_zip ON public.properties(zip_code);
CREATE INDEX idx_properties_type ON public.properties(property_type);
CREATE INDEX idx_swipes_user ON public.swipes(user_id);
CREATE INDEX idx_swipes_user_date ON public.swipes(user_id, swiped_at);
CREATE INDEX idx_swipes_user_property ON public.swipes(user_id, property_id);
CREATE INDEX idx_cashflow_user_property ON public.cashflow_inputs(user_id, property_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_inputs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User preferences policies
CREATE POLICY "Users can read own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Properties policies (readable by all authenticated users)
CREATE POLICY "Authenticated users can read active properties"
  ON public.properties FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- Service role can manage properties (for scraper)
CREATE POLICY "Service role can manage properties"
  ON public.properties FOR ALL
  USING (auth.role() = 'service_role');

-- Swipes policies
CREATE POLICY "Users can read own swipes"
  ON public.swipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own swipes"
  ON public.swipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cashflow inputs policies
CREATE POLICY "Users can read own cashflow inputs"
  ON public.cashflow_inputs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cashflow inputs"
  ON public.cashflow_inputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cashflow inputs"
  ON public.cashflow_inputs FOR UPDATE
  USING (auth.uid() = user_id);

-- Function: Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_cashflow_inputs_updated_at
  BEFORE UPDATE ON public.cashflow_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

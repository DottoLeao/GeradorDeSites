-- Initial schema for Gerador de Sites Multi-Tenant SaaS

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'client');
CREATE TYPE site_status AS ENUM ('building', 'active', 'suspended', 'error');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive');
CREATE TYPE domain_verification_status AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE health_status AS ENUM ('up', 'down', 'degraded');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sites (main tenant entity)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  template_id TEXT NOT NULL DEFAULT 'universal',
  status site_status NOT NULL DEFAULT 'building',
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sites_slug ON sites(slug);
CREATE INDEX idx_sites_owner_id ON sites(owner_id);
CREATE INDEX idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL;

-- Site content (JSONB validated by app layer)
CREATE TABLE site_content (
  site_id UUID PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site SEO metadata
CREATE TABLE site_seo (
  site_id UUID PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  schema_markup JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (Stripe mirror)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status subscription_status NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Custom domains
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  verification_status domain_verification_status NOT NULL DEFAULT 'pending',
  vercel_domain_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site health monitoring
CREATE TABLE site_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status health_status NOT NULL DEFAULT 'up',
  last_checked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  error_message TEXT,
  UNIQUE(site_id)
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER site_seo_updated_at BEFORE UPDATE ON site_seo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER domains_updated_at BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_health ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Sites policies
CREATE POLICY "Admins full access to sites"
  ON sites FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can view own sites"
  ON sites FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Clients can update own active sites"
  ON sites FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Site content policies
CREATE POLICY "Admins full access to site_content"
  ON site_content FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can view own site content"
  ON site_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_content.site_id
      AND sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own site content"
  ON site_content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sites s
      JOIN subscriptions sub ON sub.site_id = s.id
      WHERE s.id = site_content.site_id
      AND s.owner_id = auth.uid()
      AND s.status = 'active'
      AND sub.status IN ('active', 'trialing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s
      WHERE s.id = site_content.site_id
      AND s.owner_id = auth.uid()
    )
  );

-- Site SEO policies
CREATE POLICY "Admins full access to site_seo"
  ON site_seo FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can view own site seo"
  ON site_seo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_seo.site_id
      AND sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own site seo"
  ON site_seo FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_seo.site_id
      AND sites.owner_id = auth.uid()
    )
  );

-- Subscriptions policies
CREATE POLICY "Admins full access to subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can view own subscription"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = subscriptions.site_id
      AND sites.owner_id = auth.uid()
    )
  );

-- Domains policies
CREATE POLICY "Admins full access to domains"
  ON domains FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can manage own domains"
  ON domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = domains.site_id
      AND sites.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = domains.site_id
      AND sites.owner_id = auth.uid()
    )
  );

-- Site health policies
CREATE POLICY "Admins full access to site_health"
  ON site_health FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Storage bucket for site images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read site images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images');

CREATE POLICY "Authenticated users upload to own site folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'site-images'
    AND auth.role() = 'authenticated'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM sites
        WHERE sites.id::text = (storage.foldername(name))[1]
        AND sites.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users update own site images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'site-images'
    AND auth.role() = 'authenticated'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM sites
        WHERE sites.id::text = (storage.foldername(name))[1]
        AND sites.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users delete own site images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'site-images'
    AND auth.role() = 'authenticated'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM sites
        WHERE sites.id::text = (storage.foldername(name))[1]
        AND sites.owner_id = auth.uid()
      )
    )
  );

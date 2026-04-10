-- Create orgs table
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  dba_name TEXT,
  address TEXT,
  tax_id TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  mission TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create org_members table for user-org relationships
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Add org_id to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);

-- Enable RLS
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for orgs - users can see orgs they are members of
CREATE POLICY "Users can view orgs they are members of" ON orgs
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert orgs" ON orgs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update their orgs" ON orgs
  FOR UPDATE USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS policies for org_members
CREATE POLICY "Users can view their org memberships" ON org_members
  FOR SELECT USING (user_id = auth.uid() OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org memberships" ON org_members
  FOR INSERT WITH CHECK (true);

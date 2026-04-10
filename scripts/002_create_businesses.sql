-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_org_id ON businesses(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for businesses (users can manage businesses in orgs they're members of)
CREATE POLICY "Users can view businesses in their orgs" ON businesses
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert businesses in their orgs" ON businesses
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update businesses in their orgs" ON businesses
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete businesses in their orgs" ON businesses
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for contacts (through business ownership)
CREATE POLICY "Users can view contacts in their orgs" ON contacts
  FOR SELECT USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN org_members om ON b.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts in their orgs" ON contacts
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN org_members om ON b.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their orgs" ON contacts
  FOR UPDATE USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN org_members om ON b.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their orgs" ON contacts
  FOR DELETE USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN org_members om ON b.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Create the events table for inkind.one
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  mission TEXT,
  location TEXT,
  event_date DATE,
  guest_count INTEGER,
  fundraising_goal NUMERIC(12, 2),
  items_secured INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations publicly (no auth required for this MVP)
-- In production, you'd want to add user_id and proper RLS policies
CREATE POLICY "Allow public read access" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.events FOR DELETE USING (true);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

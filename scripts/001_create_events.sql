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
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow all operations publicly for MVP
CREATE POLICY "Allow public read" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.events FOR DELETE USING (true);

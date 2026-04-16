-- Drop the unique constraint on business_outreach to allow multiple outreach rounds per business per event
ALTER TABLE business_outreach 
DROP CONSTRAINT IF EXISTS business_outreach_event_id_business_id_key;

-- Add a round_number column to track outreach rounds
ALTER TABLE business_outreach 
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;

-- Add is_latest column to efficiently query for the most recent round
ALTER TABLE business_outreach 
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;

-- Create an index for efficient querying of latest outreach per business/event
CREATE INDEX IF NOT EXISTS idx_business_outreach_latest 
ON business_outreach (event_id, business_id, is_latest) 
WHERE is_latest = TRUE;

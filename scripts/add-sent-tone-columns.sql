-- Add sent_tone and sent_at columns to business_outreach table
-- These track which tone was actually sent and when

ALTER TABLE business_outreach 
ADD COLUMN IF NOT EXISTS sent_tone text,
ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN business_outreach.sent_tone IS 'The tone variant that was actually sent: professional, friendly, enthusiastic, or parent';
COMMENT ON COLUMN business_outreach.sent_at IS 'Timestamp when the outreach was marked as sent';

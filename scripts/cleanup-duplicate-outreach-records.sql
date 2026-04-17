-- Cleanup script for duplicate business_outreach records
-- This script keeps only the most recently updated record per business + event combination
-- and sets is_latest appropriately

-- Step 1: Find and show duplicates (run this first to see what will be affected)
-- SELECT 
--   business_id, 
--   event_id, 
--   COUNT(*) as record_count,
--   array_agg(id ORDER BY updated_at DESC) as record_ids
-- FROM business_outreach 
-- WHERE is_latest = true
-- GROUP BY business_id, event_id 
-- HAVING COUNT(*) > 1;

-- Step 2: For each business+event combo, keep only the record with the most recent updated_at
-- First, set all is_latest = false for duplicates
WITH duplicates AS (
  SELECT id, business_id, event_id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, event_id 
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM business_outreach
  WHERE is_latest = true
)
UPDATE business_outreach
SET is_latest = false
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Ensure exactly one is_latest = true per business+event (the most recent one)
WITH latest_records AS (
  SELECT DISTINCT ON (business_id, event_id) id
  FROM business_outreach
  ORDER BY business_id, event_id, round_number DESC, updated_at DESC NULLS LAST
)
UPDATE business_outreach
SET is_latest = true
WHERE id IN (SELECT id FROM latest_records)
AND is_latest = false;

-- Step 4: Verify - this should return 0 rows after cleanup
-- SELECT 
--   business_id, 
--   event_id, 
--   COUNT(*) as record_count
-- FROM business_outreach 
-- WHERE is_latest = true
-- GROUP BY business_id, event_id 
-- HAVING COUNT(*) > 1;

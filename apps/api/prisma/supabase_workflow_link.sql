-- ربط other_requests بـ workflow_instance
ALTER TABLE other_requests ADD COLUMN IF NOT EXISTS workflow_instance_id UUID;

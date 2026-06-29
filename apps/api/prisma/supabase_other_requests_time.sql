-- أضف حقلي الوقت لطلب الإذن
ALTER TABLE other_requests ADD COLUMN IF NOT EXISTS from_time VARCHAR(5);
ALTER TABLE other_requests ADD COLUMN IF NOT EXISTS to_time   VARCHAR(5);

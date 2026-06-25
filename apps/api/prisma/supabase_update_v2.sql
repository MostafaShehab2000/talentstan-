-- Update v2: Add advance/data_change request types + employee personal fields

-- 1. Add new OtherRequestType values
ALTER TYPE "OtherRequestType" ADD VALUE IF NOT EXISTS 'advance';
ALTER TYPE "OtherRequestType" ADD VALUE IF NOT EXISTS 'data_change';

-- 2. Add personal fields to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "nationalId" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "address" TEXT;

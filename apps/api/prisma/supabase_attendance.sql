-- Attendance & Biometric Device tables

CREATE TABLE IF NOT EXISTS attendance_records (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "employeeId"    TEXT NOT NULL REFERENCES employees(id),
  "checkIn"       TIMESTAMP(3) NOT NULL,
  "checkOut"      TIMESTAMP(3),
  date            TIMESTAMP(3) NOT NULL,
  "workedMinutes" INTEGER,
  source          TEXT NOT NULL DEFAULT 'manual',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("employeeId", date)
);

CREATE TABLE IF NOT EXISTS biometric_devices (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ip          TEXT NOT NULL,
  port        INTEGER NOT NULL DEFAULT 4370,
  password    TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "lastSync"  TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Talentstan — Seed Data

-- 1. Tenant
INSERT INTO tenants (id, name, type, status, "maxEmployees", "subscriptionPlan", "createdAt", "updatedAt")
VALUES (
  '5ac598ff-a112-4375-9500-cc564a7c7d2f',
  'دلتا للتكنولوجيا', 'company', 'active', 200, 'professional', NOW(), NOW()
);

-- 2. HR Admin
INSERT INTO employees (id, "tenantId", "employeeCode", "fullName", email, "passwordHash", status, "isManager", "hireDate", "createdAt")
VALUES (
  'f53f4598-327f-4101-82de-c80ba26c49e7',
  '5ac598ff-a112-4375-9500-cc564a7c7d2f',
  'ADMIN001', 'أحمد محمد', 'admin@delta-tech.com',
  '$2b$10$4aBQbUwimFPAiDQdGBC9UeQiRm9GeQpyuYlhPmzAQkoI0KU./H6K.',
  'active', true, '2020-01-01', NOW()
);
INSERT INTO employee_roles ("employeeId", role)
VALUES ('f53f4598-327f-4101-82de-c80ba26c49e7', 'hr_admin');

-- 3. Employee (مصطفى شهاب)
INSERT INTO employees (id, "tenantId", "employeeCode", "fullName", email, "passwordHash", status, "isManager", "hireDate", "createdAt")
VALUES (
  '21458e8e-3a17-4211-a003-5445613efd9d',
  '5ac598ff-a112-4375-9500-cc564a7c7d2f',
  '2041', 'مصطفى شهاب', 'mostafa.shehab16@gmail.com',
  '$2b$10$tUuN7shBAJMc5P388uwJX.AIf84VMy5LWG5kItp4wXim1S9T48jPC',
  'active', true, '2022-06-01', NOW()
);
INSERT INTO employee_roles ("employeeId", role)
VALUES ('21458e8e-3a17-4211-a003-5445613efd9d', 'manager');

-- 4. Leave Types
INSERT INTO leave_types (id, "tenantId", name, category, "isBalanceBased", "annualQuota", "requiresAttachment", "createdAt")
VALUES
  ('3a2f5cc5-aa60-4312-bfc5-e382d465bfee', '5ac598ff-a112-4375-9500-cc564a7c7d2f', 'إجازة سنوية', 'leave',      false, 21, false, NOW()),
  ('302bde34-b7cb-432c-b7a3-9ebbc865778f', '5ac598ff-a112-4375-9500-cc564a7c7d2f', 'إذن',         'permission', false, 12, false, NOW()),
  ('095f423c-38ad-4576-b7f2-bf4048caeb47', '5ac598ff-a112-4375-9500-cc564a7c7d2f', 'مأمورية',     'mission',    false, 10, false, NOW());

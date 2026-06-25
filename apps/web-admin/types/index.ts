export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  type: string;
  status: string;
  maxEmployees: number;
  subscriptionPlan: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  timezone?: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  fullName: string;
  employeeCode: string;
  email?: string;
  phone?: string;
  status: string;
  jobTitle?: string;
  profilePhotoUrl?: string;
  hireDate?: string;
  department?: { id: string; name: string };
  directManager?: { id: string; fullName: string };
  roles: Array<{ role: string }>;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  manager?: { id: string; fullName: string };
  _count?: { employees: number; children: number };
  children?: Department[];
}

export interface LeaveRequest {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  employee?: { id: string; fullName: string };
  leaveType?: { name: string; colorCode?: string };
  createdAt: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  employee?: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string };
  category?: { name: string };
}

export interface Payslip {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  netSalary: number;
  pdfUrl?: string;
  employee?: { id: string; fullName: string; employeeCode: string };
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  isAnonymous: boolean;
  startDate?: string;
  endDate?: string;
  _count?: { responses: number; questions: number };
}

export interface AppraisalCycle {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  _count?: { appraisals: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

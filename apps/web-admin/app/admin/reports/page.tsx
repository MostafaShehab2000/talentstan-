'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Users, FolderTree, CalendarDays, FileText, TrendingUp, Download,
} from 'lucide-react';

export default function ReportsPage() {
  const { data: empData } = useQuery({
    queryKey: ['report-employees'],
    queryFn: () => api.get('/employees', { params: { limit: 500 } }).then(r => r.data),
  });
  const { data: deptRaw } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });
  const { data: leaveData } = useQuery({
    queryKey: ['report-leave'],
    queryFn: () => api.get('/leave/requests', { params: { limit: 500 } }).then(r => r.data),
  });
  const { data: payslipData } = useQuery({
    queryKey: ['report-payslips'],
    queryFn: () => api.get('/payslips/all', { params: { limit: 500 } }).then(r => r.data),
  });

  const employees: any[] = empData?.data ?? [];
  const depts: any[] = Array.isArray(deptRaw) ? deptRaw : (deptRaw as any)?.data ?? [];
  const leaveRequests: any[] = Array.isArray(leaveData) ? leaveData : (leaveData as any)?.data ?? [];
  const payslips: any[] = Array.isArray(payslipData) ? payslipData : (payslipData as any)?.data ?? [];

  // Derived stats
  const totalActive = employees.filter(e => e.status === 'active').length;
  const totalInactive = employees.filter(e => e.status !== 'active').length;
  const byDept = depts.map(d => ({
    name: d.name,
    count: employees.filter(e => e.departmentId === d.id).length,
  })).sort((a, b) => b.count - a.count);
  const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedLeave = leaveRequests.filter(r => r.status === 'approved').length;
  const totalSalaries = payslips.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);

  const downloadEmployeesReport = async () => {
    const xlsx = await import('xlsx');
    const rows = employees.map(e => ({
      'كود الموظف': e.employeeCode,
      'الاسم الكامل': e.fullName,
      'البريد الإلكتروني': e.email ?? '',
      'القسم': e.department?.name ?? '',
      'المسمى الوظيفي': e.jobTitle?.title ?? '',
      'الحالة': e.status === 'active' ? 'نشط' : 'غير نشط',
      'تاريخ التعيين': e.hireDate ? e.hireDate.slice(0, 10) : '',
    }));
    const ws = xlsx.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'الموظفون');
    xlsx.writeFile(wb, `تقرير_الموظفين_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadLeaveReport = async () => {
    const xlsx = await import('xlsx');
    const rows = leaveRequests.map(r => ({
      'الموظف': r.employee?.fullName ?? '',
      'نوع الإجازة': r.leaveType?.name ?? '',
      'من': r.startDate?.slice(0, 10) ?? '',
      'إلى': r.endDate?.slice(0, 10) ?? '',
      'الأيام': r.totalDays ?? '',
      'الحالة': r.status,
    }));
    const ws = xlsx.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'الإجازات');
    xlsx.writeFile(wb, `تقرير_الإجازات_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">التقارير</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} className="text-blue-600" />} bg="bg-blue-50"
          label="موظفون نشطون" value={totalActive} sub={`${totalInactive} غير نشط`} />
        <StatCard icon={<FolderTree size={20} className="text-purple-600" />} bg="bg-purple-50"
          label="الأقسام" value={depts.length} sub="قسم مسجّل" />
        <StatCard icon={<CalendarDays size={20} className="text-yellow-600" />} bg="bg-yellow-50"
          label="طلبات الإجازة" value={pendingLeave} sub={`${approvedLeave} موافق عليها`} />
        <StatCard icon={<FileText size={20} className="text-green-600" />} bg="bg-green-50"
          label="إجمالي الرواتب" value={totalSalaries.toLocaleString('ar-EG')} sub="جنيه (آخر استيراد)" />
      </div>

      {/* Employees by department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> الموظفون بالقسم
            </h3>
            <Button size="sm" variant="outline" onClick={downloadEmployeesReport}>
              <Download size={14} /> Excel
            </Button>
          </div>
          {byDept.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات</p>
            : <div className="space-y-3">
                {byDept.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-gray-700 truncate text-right">{d.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full"
                        style={{ width: totalActive > 0 ? `${Math.round((d.count / totalActive) * 100)}%` : '0%' }} />
                    </div>
                    <span className="w-8 text-sm font-bold text-gray-700 text-center">{d.count}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Leave summary */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays size={16} className="text-yellow-600" /> ملخص الإجازات
            </h3>
            <Button size="sm" variant="outline" onClick={downloadLeaveReport}>
              <Download size={14} /> Excel
            </Button>
          </div>
          {leaveRequests.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">لا توجد طلبات إجازة</p>
            : <div className="space-y-3">
                {(['pending', 'approved', 'rejected'] as const).map(status => {
                  const count = leaveRequests.filter(r => r.status === status).length;
                  const colors: Record<string, string> = {
                    pending: 'bg-yellow-400',
                    approved: 'bg-green-500',
                    rejected: 'bg-red-400',
                  };
                  const labels: Record<string, string> = {
                    pending: 'قيد المراجعة',
                    approved: 'موافق عليها',
                    rejected: 'مرفوضة',
                  };
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-36 text-sm text-gray-700 text-right">{labels[status]}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div className={`${colors[status]} h-3 rounded-full`}
                          style={{ width: leaveRequests.length > 0 ? `${Math.round((count / leaveRequests.length) * 100)}%` : '0%' }} />
                      </div>
                      <span className="w-8 text-sm font-bold text-gray-700 text-center">{count}</span>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {/* Employee status breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">قائمة الموظفين الكاملة</h3>
          <Button size="sm" variant="outline" onClick={downloadEmployeesReport}>
            <Download size={14} /> تحميل Excel
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-600">الاسم</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">الكود</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">القسم</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">المسمى الوظيفي</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ التعيين</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.length === 0
              ? <tr><td colSpan={5} className="py-10 text-center text-gray-400">لا يوجد موظفون</td></tr>
              : employees.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.employeeCode}</td>
                  <td className="px-4 py-3 text-gray-600">{e.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.jobTitle?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.hireDate ? e.hireDate.slice(0, 10) : '—'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, bg, label, value, sub }: {
  icon: React.ReactNode; bg: string; label: string; value: any; sub: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

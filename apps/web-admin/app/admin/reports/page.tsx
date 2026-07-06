'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Users, FolderTree, CalendarDays, FileText, TrendingUp, Download,
  Fingerprint, DollarSign, ClipboardList,
} from 'lucide-react';

const TABS = [
  { key: 'employees', label: 'الموظفون', icon: <Users size={15} /> },
  { key: 'leave', label: 'الإجازات', icon: <CalendarDays size={15} /> },
  { key: 'attendance', label: 'الحضور', icon: <Fingerprint size={15} /> },
  { key: 'payroll', label: 'الرواتب', icon: <DollarSign size={15} /> },
] as const;

type Tab = typeof TABS[number]['key'];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('employees');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

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
  const { data: attendanceData } = useQuery({
    queryKey: ['report-attendance', month],
    queryFn: () => api.get('/attendance/admin/range', {
      params: { from: `${month}-01`, to: `${month}-31` },
    }).then(r => r.data).catch(() => []),
  });

  const employees: any[] = empData?.data ?? [];
  const depts: any[] = Array.isArray(deptRaw) ? deptRaw : (deptRaw as any)?.data ?? [];
  const leaveRequests: any[] = Array.isArray(leaveData) ? leaveData : (leaveData as any)?.data ?? [];
  const payslips: any[] = Array.isArray(payslipData) ? payslipData : (payslipData as any)?.data ?? [];
  const attendance: any[] = Array.isArray(attendanceData) ? attendanceData : [];

  const totalActive = employees.filter(e => e.status === 'active').length;
  const byDept = depts.map(d => ({
    name: d.name,
    count: employees.filter(e => e.departmentId === d.id).length,
  })).sort((a, b) => b.count - a.count).filter(d => d.count > 0);

  const totalSalaries = payslips.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);

  const downloadXlsx = async (rows: any[], sheetName: string, fileName: string) => {
    const xlsx = await import('xlsx');
    const ws = xlsx.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    xlsx.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportEmployees = () => downloadXlsx(
    employees.map(e => ({
      'كود الموظف': e.employeeCode, 'الاسم': e.fullName, 'البريد': e.email ?? '',
      'القسم': e.department?.name ?? '', 'المسمى': e.jobTitle?.title ?? '',
      'الحالة': e.status === 'active' ? 'نشط' : 'غير نشط',
      'تاريخ التعيين': e.hireDate?.slice(0, 10) ?? '',
    })), 'الموظفون', 'تقرير_الموظفين',
  );

  const exportLeave = () => downloadXlsx(
    leaveRequests.map(r => ({
      'الموظف': r.employee?.fullName ?? '', 'نوع الإجازة': r.leaveType?.name ?? '',
      'من': r.startDate?.slice(0, 10) ?? '', 'إلى': r.endDate?.slice(0, 10) ?? '',
      'الأيام': r.totalDays ?? '', 'الحالة': r.status,
    })), 'الإجازات', 'تقرير_الإجازات',
  );

  const exportAttendance = () => downloadXlsx(
    attendance.map(a => ({
      'الموظف': a.employee?.fullName ?? a.employeeId, 'التاريخ': a.date?.slice(0, 10) ?? '',
      'وقت الحضور': a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('ar-EG') : '—',
      'وقت الانصراف': a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('ar-EG') : '—',
      'ساعات العمل': a.workedMinutes ? `${Math.floor(a.workedMinutes / 60)}:${String(a.workedMinutes % 60).padStart(2, '0')}` : '—',
      'الحالة': a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب',
    })), 'الحضور', 'تقرير_الحضور',
  );

  const exportPayroll = () => downloadXlsx(
    payslips.map(p => ({
      'الموظف': p.employee?.fullName ?? '', 'الشهر': p.month, 'السنة': p.year,
      'الراتب الأساسي': p.basicSalary, 'صافي الراتب': p.netSalary,
      'طريقة الصرف': p.allowances?.paymentMethod === 'bank' ? 'بنك' : 'كاش',
    })), 'الرواتب', 'تقرير_الرواتب',
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">التقارير</h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ClipboardList size={14} />
          آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} className="text-blue-600" />} bg="bg-blue-50"
          label="موظفون نشطون" value={totalActive} sub={`${employees.length - totalActive} غير نشط`} />
        <KpiCard icon={<FolderTree size={20} className="text-purple-600" />} bg="bg-purple-50"
          label="الأقسام" value={depts.length} sub="قسم مسجّل" />
        <KpiCard icon={<CalendarDays size={20} className="text-yellow-600" />} bg="bg-yellow-50"
          label="طلبات الإجازة" value={leaveRequests.filter(r => ['submitted', 'in_review'].includes(r.status)).length}
          sub={`${leaveRequests.filter(r => r.status === 'approved').length} موافق عليها`} />
        <KpiCard icon={<FileText size={20} className="text-green-600" />} bg="bg-green-50"
          label="إجمالي الرواتب" value={totalSalaries.toLocaleString('ar-EG')} sub="جنيه" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Employees Tab ── */}
      {tab === 'employees' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">توزيع الموظفين بالأقسام</h3>
            <Button size="sm" variant="outline" onClick={exportEmployees}><Download size={14} /> Excel</Button>
          </div>
          <div className="p-5 space-y-3">
            {byDept.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-700 truncate text-right">{d.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: totalActive > 0 ? `${Math.round((d.count / totalActive) * 100)}%` : '0%' }} />
                </div>
                <span className="w-10 text-sm font-bold text-gray-700 text-center">{d.count}</span>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-t border-gray-100">
              <tr>
                {['الاسم', 'الكود', 'القسم', 'المسمى الوظيفي', 'الحالة', 'تاريخ التعيين'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.employeeCode}</td>
                  <td className="px-4 py-3 text-gray-600">{e.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.jobTitle?.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.hireDate?.slice(0, 10) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Leave Tab ── */}
      {tab === 'leave' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">تقرير الإجازات ({leaveRequests.length} طلب)</h3>
            <Button size="sm" variant="outline" onClick={exportLeave}><Download size={14} /> Excel</Button>
          </div>
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: 'قيد المراجعة', statuses: ['submitted', 'in_review'], color: 'text-yellow-700 bg-yellow-50' },
              { label: 'موافق عليها', statuses: ['approved'], color: 'text-green-700 bg-green-50' },
              { label: 'مرفوضة', statuses: ['rejected'], color: 'text-red-700 bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} p-4 text-center`}>
                <p className="text-2xl font-bold">{leaveRequests.filter(r => s.statuses.includes(r.status)).length}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['الموظف', 'النوع', 'من', 'إلى', 'الأيام', 'الحالة'].map(h => (
                <th key={h} className="px-4 py-3 text-right font-medium text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaveRequests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.employee?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.leaveType?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.startDate?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.endDate?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-center font-medium">{r.totalDays ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <Button size="sm" variant="outline" onClick={exportAttendance} disabled={attendance.length === 0}>
              <Download size={14} /> Excel
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {attendance.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Fingerprint size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">لا توجد بيانات حضور لهذا الشهر</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['الموظف', 'التاريخ', 'وقت الحضور', 'وقت الانصراف', 'ساعات العمل', 'الحالة'].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-medium text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.employee?.fullName ?? a.employeeId}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-gray-600">{a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{a.workedMinutes ? `${Math.floor(a.workedMinutes / 60)}:${String(a.workedMinutes % 60).padStart(2, '0')}` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Payroll Tab ── */}
      {tab === 'payroll' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">تقرير الرواتب ({payslips.length} كشف)</h3>
            <Button size="sm" variant="outline" onClick={exportPayroll}><Download size={14} /> Excel</Button>
          </div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: 'إجمالي الصرف', value: `${totalSalaries.toLocaleString('ar-EG')} ج` },
              { label: 'متوسط الراتب', value: payslips.length > 0 ? `${Math.round(totalSalaries / payslips.length).toLocaleString('ar-EG')} ج` : '—' },
              { label: 'عدد الكشوف', value: payslips.length },
            ].map(s => (
              <div key={s.label} className="p-4 text-center bg-white">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['الموظف', 'الشهر / السنة', 'الأساسي', 'صافي الراتب', 'طريقة الصرف'].map(h => (
                <th key={h} className="px-4 py-3 text-right font-medium text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payslips.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.employee?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.month} / {p.year}</td>
                  <td className="px-4 py-3 text-gray-700">{Number(p.basicSalary).toLocaleString('ar-EG')}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{Number(p.netSalary).toLocaleString('ar-EG')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.allowances?.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {p.allowances?.paymentMethod === 'bank' ? 'بنك' : 'كاش'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, bg, label, value, sub }: { icon: React.ReactNode; bg: string; label: string; value: any; sub: string }) {
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present: 'bg-green-100 text-green-700', late: 'bg-yellow-100 text-yellow-700',
    absent: 'bg-red-100 text-red-700', approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700', submitted: 'bg-blue-100 text-blue-700',
    in_review: 'bg-yellow-100 text-yellow-700',
  };
  const labels: Record<string, string> = {
    present: 'حاضر', late: 'متأخر', absent: 'غائب',
    approved: 'موافق عليه', rejected: 'مرفوض',
    submitted: 'معلق', in_review: 'قيد المراجعة',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

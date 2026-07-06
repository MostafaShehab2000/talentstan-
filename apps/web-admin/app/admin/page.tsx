'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Users, CalendarDays, HelpCircle, Clock, CheckCircle2,
  XCircle, AlertTriangle, TrendingUp, ArrowLeft, UserPlus,
  ClipboardList,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">جارٍ تحميل البيانات…</p>
      </div>
    </div>
  );

  const s = stats ?? {};
  const emp = s.employees ?? {};
  const att = s.attendance ?? {};
  const pend = s.pending ?? {};

  const attRate = att.rate ?? 0;
  const attColor = attRate >= 90 ? '#10b981' : attRate >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">لوحة التحكم</h2>
          <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/admin/employees" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <UserPlus size={16} />
          إضافة موظف
        </Link>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الموظفين"
          value={emp.active ?? 0}
          subtitle={`من ${emp.total ?? 0} إجمالي`}
          icon={<Users size={20} />}
          color="blue"
          trend={emp.trend}
        />
        <StatCard
          title="حاضرون اليوم"
          value={att.present ?? 0}
          subtitle={`نسبة الحضور ${attRate}%`}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />
        <StatCard
          title="طلبات معلقة"
          value={pend.total ?? 0}
          subtitle={`${pend.leave ?? 0} إجازة • ${pend.otherRequests ?? 0} إذن`}
          icon={<ClipboardList size={20} />}
          color="yellow"
        />
        <StatCard
          title="تذاكر دعم مفتوحة"
          value={s.tickets?.open ?? 0}
          icon={<HelpCircle size={20} />}
          color="red"
        />
      </div>

      {/* Attendance Ring + Monthly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Attendance Donut */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">حضور اليوم</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                <circle
                  cx="18" cy="18" r="15.9155" fill="none"
                  stroke={attColor} strokeWidth="3.5"
                  strokeDasharray={`${attRate} ${100 - attRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{attRate}%</span>
                <span className="text-xs text-gray-400">نسبة الحضور</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="text-lg font-bold text-emerald-700">{att.present ?? 0}</p>
              <p className="text-xs text-emerald-600">حاضر</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-2">
              <p className="text-lg font-bold text-yellow-700">{att.late ?? 0}</p>
              <p className="text-xs text-yellow-600">متأخر</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-lg font-bold text-red-700">{att.absent ?? 0}</p>
              <p className="text-xs text-red-600">غائب</p>
            </div>
          </div>
        </div>

        {/* Monthly Leave Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">الإجازات المعتمدة (آخر 6 شهور)</h3>
            <TrendingUp size={16} className="text-gray-400" />
          </div>
          <div className="flex items-end gap-2 h-32">
            {(s.monthlyLeave ?? []).map((m: any, i: number) => {
              const max = Math.max(...(s.monthlyLeave ?? []).map((x: any) => x.count), 1);
              const h = Math.round((m.count / max) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-600">{m.count}</span>
                  <div
                    className="w-full rounded-t-md bg-blue-500 transition-all"
                    style={{ height: `${Math.max(h, 4)}%`, opacity: 0.5 + (i / 10) }}
                  />
                  <span className="text-xs text-gray-400">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Approvals + Upcoming Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">آخر الطلبات</h3>
            <Link href="/admin/leave" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(s.recentActivities ?? []).length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">لا توجد طلبات</p>
            ) : (s.recentActivities ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                  {a.employee?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.employee}</p>
                  <p className="text-xs text-gray-400">{a.type}</p>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Leaves this week */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">إجازات هذا الأسبوع</h3>
            <CalendarDays size={16} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {(s.upcomingLeaves ?? []).length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">لا توجد إجازات هذا الأسبوع</p>
            ) : (s.upcomingLeaves ?? []).map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold flex-shrink-0">
                  {l.employee?.fullName?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.employee?.fullName}</p>
                  <p className="text-xs text-gray-400">{l.leaveType?.name}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">{formatDate(l.startDate)}</p>
                  <p className="text-xs text-gray-400">→ {formatDate(l.endDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">وصول سريع</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/leave', label: 'طلبات الإجازة', icon: <CalendarDays size={20} />, color: 'text-blue-600 bg-blue-50' },
            { href: '/admin/employees', label: 'الموظفون', icon: <Users size={20} />, color: 'text-emerald-600 bg-emerald-50' },
            { href: '/admin/payslips', label: 'الرواتب', icon: <TrendingUp size={20} />, color: 'text-purple-600 bg-purple-50' },
            { href: '/admin/helpdesk', label: 'الدعم الفني', icon: <HelpCircle size={20} />, color: 'text-orange-600 bg-orange-50' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
              <div className={`rounded-lg p-2.5 ${item.color}`}>{item.icon}</div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

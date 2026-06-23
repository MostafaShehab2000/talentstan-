'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/ui/card';
import { Users, CalendarDays, HelpCircle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then((r) => r.data) });
  const { data: leaveData } = useQuery({ queryKey: ['leave-all'], queryFn: () => api.get('/leave/requests').then((r) => r.data) });
  const { data: ticketData } = useQuery({ queryKey: ['tickets'], queryFn: () => api.get('/helpdesk/tickets').then((r) => r.data) });
  const { data: surveyData } = useQuery({ queryKey: ['surveys'], queryFn: () => api.get('/surveys').then((r) => r.data) });

  const employees = empData?.data ?? [];
  const leaveRequests = leaveData?.data ?? [];
  const tickets = ticketData?.data ?? [];
  const surveys = surveyData ?? [];

  const pendingLeave = leaveRequests.filter((r: any) => r.status === 'pending').length;
  const openTickets = tickets.filter((t: any) => t.status === 'open').length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">لوحة تحكم HR Admin</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي الموظفين" value={empData?.total ?? 0} icon={<Users size={20} />} color="blue" />
        <StatCard title="طلبات إجازة معلقة" value={pendingLeave} icon={<CalendarDays size={20} />} color="yellow" />
        <StatCard title="تذاكر مفتوحة" value={openTickets} icon={<HelpCircle size={20} />} color="red" />
        <StatCard title="استطلاعات نشطة" value={surveys.length} icon={<ClipboardList size={20} />} color="purple" />
      </div>

      {/* Recent leave requests */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">آخر طلبات الإجازة</h3>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>الموظف</Th>
              <Th>نوع الإجازة</Th>
              <Th>من</Th>
              <Th>إلى</Th>
              <Th>الحالة</Th>
            </tr>
          </Thead>
          <Tbody>
            {leaveRequests.length === 0 ? <EmptyState message="لا توجد طلبات" /> : leaveRequests.slice(0, 8).map((r: any) => (
              <Tr key={r.id}>
                <Td><span className="font-medium">{r.employee?.fullName ?? '—'}</span></Td>
                <Td>{r.leaveType?.name ?? '—'}</Td>
                <Td>{formatDate(r.startDate)}</Td>
                <Td>{formatDate(r.endDate)}</Td>
                <Td><Badge status={r.status} /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}

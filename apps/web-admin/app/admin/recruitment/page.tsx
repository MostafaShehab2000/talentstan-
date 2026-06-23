'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/badge';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

const priorityColor: Record<string, string> = { low: 'gray', medium: 'blue', high: 'yellow', urgent: 'red' };

export default function RecruitmentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['recruitment'],
    queryFn: () => api.get('/recruitment').then((r) => r.data),
  });

  const requests = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">طلبات التوظيف</h2>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>المسمى الوظيفي</Th>
                <Th>القسم</Th>
                <Th>مقدم الطلب</Th>
                <Th>العدد المطلوب</Th>
                <Th>الأولوية</Th>
                <Th>الحالة</Th>
                <Th>تاريخ الطلب</Th>
              </tr>
            </Thead>
            <Tbody>
              {requests.length === 0 ? <EmptyState /> : requests.map((r: any) => (
                <Tr key={r.id}>
                  <Td><span className="font-medium">{r.jobTitle}</span></Td>
                  <Td>{r.department?.name ?? '—'}</Td>
                  <Td>{r.requestedBy?.fullName ?? '—'}</Td>
                  <Td>{r.headcount}</Td>
                  <Td><Tag color={priorityColor[r.priority] ?? 'gray'}>{r.priority}</Tag></Td>
                  <Td><Badge status={r.status} /></Td>
                  <Td>{formatDate(r.createdAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

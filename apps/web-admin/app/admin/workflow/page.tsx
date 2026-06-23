'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export default function WorkflowPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['workflow-pending'],
    queryFn: () => api.get('/workflow/pending').then((r) => r.data),
  });

  const instances = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">مسارات الموافقة المعلقة</h2>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>نوع الطلب</Th>
                <Th>مقدم الطلب</Th>
                <Th>الخطوة الحالية</Th>
                <Th>الحالة</Th>
                <Th>تاريخ البدء</Th>
              </tr>
            </Thead>
            <Tbody>
              {instances.length === 0 ? <EmptyState message="لا توجد طلبات معلقة" /> : instances.map((i: any) => (
                <Tr key={i.id}>
                  <Td><span className="font-medium">{i.entityType ?? '—'}</span></Td>
                  <Td>{i.initiator?.fullName ?? '—'}</Td>
                  <Td>{i.currentStepOrder ?? '—'}</Td>
                  <Td><Badge status={i.status} /></Td>
                  <Td>{formatDate(i.startedAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

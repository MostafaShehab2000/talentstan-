'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';

export default function LeavePage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leave-all', status, page],
    queryFn: () => api.get('/leave/requests/all', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: string; comment?: string }) =>
      api.post(`/workflow/action`, { instanceId: id, action, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-all'] }),
  });

  const requests = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">إدارة الإجازات</h2>
      </div>

      <div className="flex items-center gap-3">
        <Select
          options={[
            { value: 'pending', label: 'معلقة' },
            { value: 'approved', label: 'موافق عليها' },
            { value: 'rejected', label: 'مرفوضة' },
            { value: 'cancelled', label: 'ملغاة' },
          ]}
          placeholder="كل الحالات"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>الموظف</Th>
                <Th>نوع الإجازة</Th>
                <Th>من</Th>
                <Th>إلى</Th>
                <Th>الأيام</Th>
                <Th>الحالة</Th>
                <Th>إجراء</Th>
              </tr>
            </Thead>
            <Tbody>
              {requests.length === 0 ? <EmptyState /> : requests.map((r: any) => (
                <Tr key={r.id}>
                  <Td><span className="font-medium">{r.employee?.fullName ?? '—'}</span></Td>
                  <Td>{r.leaveType?.name ?? '—'}</Td>
                  <Td>{formatDate(r.startDate)}</Td>
                  <Td>{formatDate(r.endDate)}</Td>
                  <Td>{r.totalDays}</Td>
                  <Td><Badge status={r.status} /></Td>
                  <Td>
                    {r.status === 'pending' && r.workflowInstanceId && (
                      <div className="flex gap-1">
                        <Button
                          variant="success" size="sm"
                          onClick={() => actionMut.mutate({ id: r.workflowInstanceId, action: 'approve' })}
                        >
                          <CheckCircle size={14} />
                        </Button>
                        <Button
                          variant="danger" size="sm"
                          onClick={() => actionMut.mutate({ id: r.workflowInstanceId, action: 'reject' })}
                        >
                          <XCircle size={14} />
                        </Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">إجمالي {data.total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

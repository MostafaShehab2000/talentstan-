'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { Tag } from '@/components/ui/badge';
import type { HelpdeskTicket } from '@/types';

const priorityColor: Record<string, string> = {
  low: 'gray', medium: 'blue', high: 'yellow', urgent: 'red',
};

export default function HelpdeskPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<HelpdeskTicket | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', status, priority],
    queryFn: () => api.get('/helpdesk/tickets', { params: { status: status || undefined, priority: priority || undefined } }).then((r) => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/helpdesk/tickets/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tickets'] }); setSelected(null); },
  });

  const tickets: HelpdeskTicket[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">الدعم الفني — HR Tickets</h2>

      <div className="flex items-center gap-3">
        <Select
          options={[{ value: 'open', label: 'مفتوحة' }, { value: 'in_progress', label: 'قيد المعالجة' }, { value: 'resolved', label: 'محلولة' }, { value: 'closed', label: 'مغلقة' }]}
          placeholder="كل الحالات"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
        />
        <Select
          options={[{ value: 'urgent', label: 'عاجل' }, { value: 'high', label: 'عالي' }, { value: 'medium', label: 'متوسط' }, { value: 'low', label: 'منخفض' }]}
          placeholder="كل الأولويات"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
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
                <Th>رقم التذكرة</Th>
                <Th>الموضوع</Th>
                <Th>الموظف</Th>
                <Th>التصنيف</Th>
                <Th>الأولوية</Th>
                <Th>الحالة</Th>
                <Th>تاريخ الفتح</Th>
                <Th>إجراء</Th>
              </tr>
            </Thead>
            <Tbody>
              {tickets.length === 0 ? <EmptyState /> : tickets.map((t) => (
                <Tr key={t.id} onClick={() => setSelected(t)}>
                  <Td><span className="font-mono text-xs text-blue-700">{t.ticketNumber}</span></Td>
                  <Td><span className="font-medium">{t.subject}</span></Td>
                  <Td>{t.employee?.fullName ?? '—'}</Td>
                  <Td>{t.category?.name ?? '—'}</Td>
                  <Td><Tag color={priorityColor[t.priority]}>{t.priority}</Tag></Td>
                  <Td><Badge status={t.status} /></Td>
                  <Td>{formatDate(t.createdAt)}</Td>
                  <Td>
                    {t.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: t.id, body: { status: 'in_progress' } }); }}>
                        استلام
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`تذكرة: ${selected?.ticketNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">الموظف:</span> <span className="font-medium">{selected.employee?.fullName}</span></div>
              <div><span className="text-gray-500">التصنيف:</span> <span className="font-medium">{selected.category?.name}</span></div>
              <div><span className="text-gray-500">الأولوية:</span> <Tag color={priorityColor[selected.priority]}>{selected.priority}</Tag></div>
              <div><span className="text-gray-500">الحالة:</span> <Badge status={selected.status} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="success" size="sm" onClick={() => updateMut.mutate({ id: selected.id, body: { status: 'resolved' } })}>تأشير محلول</Button>
              <Button variant="danger" size="sm" onClick={() => updateMut.mutate({ id: selected.id, body: { status: 'closed' } })}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

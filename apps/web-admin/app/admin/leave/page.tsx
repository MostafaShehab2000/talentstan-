'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = { leave: 'إجازة', permission: 'إذن', mission: 'مأمورية' };
const STATUS_LABELS: Record<string, string> = { pending: 'معلق', approved: 'موافق', rejected: 'مرفوض', cancelled: 'ملغي' };

type LeaveType = { id: string; name: string; category: string; annualQuota?: number; requiresAttachment?: boolean };
type LeaveRequest = {
  id: string; startDate: string; endDate: string; status: string; totalDays: number;
  employee?: { fullName: string; employeeCode: string }; leaveType?: { name: string };
};
type FormData = { name: string; category: string; annualQuota?: string; minDays?: string; maxDays?: string; requiresAttachment: boolean };

export default function LeavePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'types' | 'requests'>('types');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [apiError, setApiError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: typesRaw = [], isLoading: typesLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/leave/types').then(r => r.data),
  });
  const { data: reqRaw, isLoading: reqLoading } = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: () => api.get('/leave/requests/all', { params: { status: statusFilter || undefined, limit: 50 } }).then(r => r.data),
    enabled: tab === 'requests',
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { category: 'leave', requiresAttachment: false },
  });

  const saveMut = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: any }) =>
      id ? api.patch(`/leave/types/${id}`, body) : api.post('/leave/types', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); setOpen(false); },
    onError: (err: any) => { const m = err.response?.data?.message; setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ')); },
  });
  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.patch(`/leave/requests/${id}/${action}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const onSubmit = (d: FormData) => {
    const body: any = { name: d.name, category: d.category, requiresAttachment: d.requiresAttachment };
    if (d.annualQuota) body.annualQuota = Number(d.annualQuota);
    if (d.minDays) body.minDays = Number(d.minDays);
    if (d.maxDays) body.maxDays = Number(d.maxDays);
    saveMut.mutate({ id: editing?.id, body });
  };

  const types: LeaveType[] = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.data ?? [];
  const requests: LeaveRequest[] = Array.isArray(reqRaw) ? reqRaw : (reqRaw as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">الإجازات والأذونات</h2>
        {tab === 'types' && <Button onClick={() => { setEditing(null); reset({ category: 'leave', requiresAttachment: false }); setApiError(''); setOpen(true); }}><Plus size={16} /> نوع جديد</Button>}
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['types', 'requests'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>
            {t === 'types' ? 'أنواع الإجازات' : 'طلبات الموظفين'}
          </button>
        ))}
      </div>

      {tab === 'types' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {typesLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
            <Table><Thead><tr><Th>النوع</Th><Th>الفئة</Th><Th>الحصة السنوية</Th><Th>مرفق مطلوب</Th><Th>إجراءات</Th></tr></Thead>
              <Tbody>{types.length === 0 ? <EmptyState /> : types.map(t => (
                <Tr key={t.id}>
                  <Td><span className="font-medium">{t.name}</span></Td>
                  <Td>{CATEGORY_LABELS[t.category] ?? t.category}</Td>
                  <Td>{t.annualQuota ? `${t.annualQuota} يوم` : '—'}</Td>
                  <Td>{t.requiresAttachment ? <CheckCircle size={16} className="text-green-500" /> : '—'}</Td>
                  <Td><Button size="sm" variant="outline" onClick={() => { setEditing(t); reset({ name: t.name, category: t.category, requiresAttachment: t.requiresAttachment ?? false }); setApiError(''); setOpen(true); }}><Pencil size={13} /> تعديل</Button></Td>
                </Tr>
              ))}</Tbody>
            </Table>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {reqLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
              <Table><Thead><tr><Th>الموظف</Th><Th>النوع</Th><Th>من</Th><Th>إلى</Th><Th>أيام</Th><Th>الحالة</Th><Th>إجراءات</Th></tr></Thead>
                <Tbody>{requests.length === 0 ? <EmptyState /> : requests.map(r => (
                  <Tr key={r.id}>
                    <Td><div><p className="font-medium">{r.employee?.fullName}</p><p className="text-xs text-gray-400">{r.employee?.employeeCode}</p></div></Td>
                    <Td>{r.leaveType?.name}</Td>
                    <Td>{new Date(r.startDate).toLocaleDateString('ar-EG')}</Td>
                    <Td>{new Date(r.endDate).toLocaleDateString('ar-EG')}</Td>
                    <Td>{r.totalDays}</Td>
                    <Td><Badge status={r.status} /></Td>
                    <Td>{r.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => actionMut.mutate({ id: r.id, action: 'approve' })}><CheckCircle size={13} /> قبول</Button>
                        <Button size="sm" variant="danger" onClick={() => actionMut.mutate({ id: r.id, action: 'reject' })}><XCircle size={13} /> رفض</Button>
                      </div>
                    )}</Td>
                  </Tr>
                ))}</Tbody>
              </Table>
            )}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل نوع الإجازة' : 'نوع إجازة جديد'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="اسم النوع" placeholder="مثال: إجازة سنوية" {...register('name', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">الفئة</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('category')}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Input label="الحصة السنوية (أيام)" type="number" placeholder="21" {...register('annualQuota')} />
            <Input label="الحد الأدنى (أيام)" type="number" placeholder="1" {...register('minDays')} />
            <Input label="الحد الأقصى (أيام)" type="number" placeholder="30" {...register('maxDays')} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded" {...register('requiresAttachment')} />
            يتطلب مرفق (شهادة طبية، إلخ)
          </label>
          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={isSubmitting || saveMut.isPending}>{editing ? 'تحديث' : 'حفظ'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

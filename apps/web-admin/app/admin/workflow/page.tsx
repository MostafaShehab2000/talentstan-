'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const MODULE_LABELS: Record<string, string> = {
  leave: 'إجازة', permission: 'إذن', mission: 'مأمورية',
  appraisal: 'تقييم', recruitment: 'توظيف', helpdesk: 'دعم فني',
};
const APPROVER_LABELS: Record<string, string> = {
  direct_manager: 'المدير المباشر', department_head: 'مدير الإدارة',
  specific_role: 'دور محدد', specific_user: 'موظف محدد',
};

type Template = { id: string; name: string; module: string; steps?: any[]; _count?: { steps: number } };
type FormData = {
  name: string; module: string;
  steps: { stepOrder: number; approverType: string; slaHours?: number }[];
};

export default function WorkflowPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'templates' | 'pending'>('templates');
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState('');

  const { data: templatesRaw = [], isLoading: tLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => api.get('/workflow/templates').then(r => r.data),
  });
  const { data: pendingRaw, isLoading: pLoading } = useQuery({
    queryKey: ['workflow-pending'],
    queryFn: () => api.get('/workflow/pending').then(r => r.data),
    enabled: tab === 'pending',
  });

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { module: 'leave', steps: [{ stepOrder: 1, approverType: 'direct_manager', slaHours: 24 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/workflow/templates', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-templates'] }); setOpen(false); reset(); },
    onError: (err: any) => { const m = err.response?.data?.message; setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ')); },
  });

  const onSubmit = (d: FormData) => {
    createMut.mutate({
      name: d.name, module: d.module,
      steps: d.steps.map((s, i) => ({ ...s, stepOrder: i + 1, slaHours: s.slaHours ? Number(s.slaHours) : undefined })),
    });
  };

  const templates: Template[] = Array.isArray(templatesRaw) ? templatesRaw : (templatesRaw as any)?.data ?? [];
  const pending: any[] = Array.isArray(pendingRaw) ? pendingRaw : (pendingRaw as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">مسارات الموافقة</h2>
        {tab === 'templates' && (
          <Button onClick={() => { reset({ module: 'leave', steps: [{ stepOrder: 1, approverType: 'direct_manager', slaHours: 24 }] }); setApiError(''); setOpen(true); }}>
            <Plus size={16} /> مسار جديد
          </Button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['templates', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>
            {t === 'templates' ? 'قوالب المسارات' : 'الطلبات المعلقة'}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {tLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
            <Table><Thead><tr><Th>اسم المسار</Th><Th>النوع</Th><Th>عدد الخطوات</Th></tr></Thead>
              <Tbody>{templates.length === 0 ? <EmptyState /> : templates.map(t => (
                <Tr key={t.id}>
                  <Td><div className="flex items-center gap-2"><GitBranch size={16} className="text-blue-400" /><span className="font-medium">{t.name}</span></div></Td>
                  <Td>{MODULE_LABELS[t.module] ?? t.module}</Td>
                  <Td>{t._count?.steps ?? t.steps?.length ?? '—'} خطوات</Td>
                </Tr>
              ))}</Tbody>
            </Table>
          )}
        </div>
      )}

      {tab === 'pending' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {pLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
            <Table><Thead><tr><Th>نوع الطلب</Th><Th>مقدم الطلب</Th><Th>الخطوة الحالية</Th><Th>الحالة</Th><Th>تاريخ البدء</Th></tr></Thead>
              <Tbody>{pending.length === 0 ? <EmptyState message="لا توجد طلبات معلقة" /> : pending.map((i: any) => (
                <Tr key={i.id}>
                  <Td><span className="font-medium">{i.entityType ?? '—'}</span></Td>
                  <Td>{i.initiator?.fullName ?? '—'}</Td>
                  <Td>{i.currentStepOrder ?? '—'}</Td>
                  <Td><Badge status={i.status} /></Td>
                  <Td>{formatDate(i.startedAt)}</Td>
                </Tr>
              ))}</Tbody>
            </Table>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="إنشاء مسار موافقة جديد" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم المسار" placeholder="مثال: مسار إجازة الموظفين" {...register('name', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">النوع</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('module')}>
                {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">خطوات الموافقة (بالترتيب)</p>
              <Button type="button" variant="outline" size="sm"
                onClick={() => append({ stepOrder: fields.length + 1, approverType: 'direct_manager', slaHours: 24 })}>
                <Plus size={13} /> خطوة
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{i + 1}</span>
                <select className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register(`steps.${i}.approverType`)}>
                  {Object.entries(APPROVER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Input placeholder="SLA (ساعة)" type="number" className="w-28" {...register(`steps.${i}.slaHours`)} />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                )}
              </div>
            ))}
          </div>

          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>إنشاء</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

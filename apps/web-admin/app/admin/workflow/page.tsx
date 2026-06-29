'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, Trash2, GitBranch, ChevronDown, Check, Link2 } from 'lucide-react';

const APPROVER_LABELS: Record<string, string> = {
  direct_manager:   'المدير المباشر',
  department_head:  'مدير الإدارة',
  specific_role:    'دور محدد (HR)',
  specific_user:    'موظف محدد',
};
const APPROVER_COLORS: Record<string, string> = {
  direct_manager:  'bg-blue-100 text-blue-700',
  department_head: 'bg-purple-100 text-purple-700',
  specific_role:   'bg-green-100 text-green-700',
  specific_user:   'bg-orange-100 text-orange-700',
};

const OTHER_TYPE_LABELS: Record<string, string> = {
  permission: 'طلب إذن',
  mission:    'طلب مأمورية',
  advance:    'طلب سلفة',
};

type Template = { id: string; name: string; steps?: any[]; _count?: { steps: number } };
type LeaveType = { id: string; name: string; category: string; workflowTemplateId?: string };
type FormData = {
  name: string;
  steps: { stepOrder: number; approverType: string; slaHours?: number }[];
};

export default function WorkflowPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'templates' | 'assign'>('assign');
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState('');

  // Data
  const { data: templatesRaw = [], isLoading: tLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => api.get('/workflow/templates').then(r => r.data),
  });
  const { data: typesRaw, isLoading: typesLoading } = useQuery({
    queryKey: ['leave-types-wf'],
    queryFn: () => api.get('/leave/types').then(r => r.data),
    enabled: tab === 'assign',
  });

  const templates: Template[] = Array.isArray(templatesRaw) ? templatesRaw : (templatesRaw as any)?.data ?? [];
  const leaveTypes: LeaveType[] = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.data ?? [];

  // Form
  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      name: '',
      steps: [{ stepOrder: 1, approverType: 'direct_manager', slaHours: 24 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });

  // Mutations
  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/workflow/templates', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-templates'] });
      setOpen(false); reset();
    },
    onError: (err: any) => {
      const m = err.response?.data?.message;
      setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ'));
    },
  });

  const assignMut = useMutation({
    mutationFn: ({ typeId, templateId }: { typeId: string; templateId: string | null }) =>
      api.patch(`/leave/types/${typeId}`, { workflowTemplateId: templateId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types-wf'] }),
  });

  const onSubmit = (d: FormData) => {
    createMut.mutate({
      name: d.name,
      steps: d.steps.map((s, i) => ({ ...s, stepOrder: i + 1, slaHours: s.slaHours ? Number(s.slaHours) : undefined })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">مسارات الموافقة</h2>
          <p className="text-sm text-gray-500 mt-0.5">حدد من يوافق على كل نوع طلب وبأي ترتيب</p>
        </div>
        <Button onClick={() => { reset(); setApiError(''); setOpen(true); }}>
          <Plus size={16} /> مسار جديد
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {([['assign', 'تعيين المسارات'], ['templates', 'قوالب المسارات']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: تعيين المسارات ══════════ */}
      {tab === 'assign' && (
        <div className="space-y-6">
          {typesLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
          ) : (
            <>
              {/* Leave Types */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">🏖️ أنواع الإجازات</h3>
                  <p className="text-xs text-gray-400 mt-0.5">اختر مسار الموافقة لكل نوع إجازة</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {leaveTypes.length === 0 && (
                    <p className="text-center text-gray-400 py-8 text-sm">لا توجد أنواع إجازة — أضفها من صفحة الإجازات</p>
                  )}
                  {leaveTypes.map(lt => {
                    const assigned = templates.find(t => t.id === lt.workflowTemplateId);
                    return (
                      <div key={lt.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{lt.name}</p>
                          <p className="text-xs text-gray-400">{lt.category === 'leave' ? 'إجازة' : lt.category === 'permission' ? 'إذن' : 'مأمورية'}</p>
                        </div>

                        {assigned ? (
                          <div className="flex items-center gap-3">
                            <WorkflowStepsPreview steps={assigned.steps ?? []} />
                            <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                              {assigned.name}
                            </span>
                            <button onClick={() => assignMut.mutate({ typeId: lt.id, templateId: null })}
                              className="text-xs text-red-500 hover:text-red-700 underline">
                              إزالة
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">بدون مسار — موافقة مباشرة</span>
                            <TemplateSelector
                              templates={templates}
                              onSelect={(tid) => assignMut.mutate({ typeId: lt.id, templateId: tid })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other Requests (static info) */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">📋 طلبات أخرى (إذن / مأمورية / سلفة)</h3>
                  <p className="text-xs text-gray-400 mt-0.5">المسار الافتراضي: مدير مباشر → HR</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {Object.entries(OTHER_TYPE_LABELS).map(([type, label]) => (
                    <div key={type} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md">المدير المباشر</span>
                          <span className="text-gray-300">→</span>
                          <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-md">HR</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: قوالب المسارات ══════════ */}
      {tab === 'templates' && (
        <div className="space-y-4">
          {tLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <GitBranch size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">لا توجد مسارات بعد</p>
              <p className="text-gray-400 text-sm mt-1">أنشئ مسار جديد لتحديد خطوات الموافقة</p>
              <Button className="mt-4" onClick={() => { reset(); setApiError(''); setOpen(true); }}>
                <Plus size={16} /> مسار جديد
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(t => (
                <div key={t.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <GitBranch size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{(t.steps?.length ?? t._count?.steps ?? 0)} خطوات</p>
                    </div>
                  </div>

                  {/* Steps visualization */}
                  <div className="space-y-2">
                    {(t.steps ?? []).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${APPROVER_COLORS[s.approverType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {APPROVER_LABELS[s.approverType] ?? s.approverType}
                        </span>
                        {s.slaHours && (
                          <span className="text-xs text-gray-400">خلال {s.slaHours} ساعة</span>
                        )}
                        {i < (t.steps?.length ?? 0) - 1 && (
                          <div className="h-4 w-px bg-gray-200 mr-1" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Assigned to */}
                  {leaveTypes.filter(lt => lt.workflowTemplateId === t.id).length > 0 && (
                    <div className="rounded-lg bg-gray-50 px-3 py-2 flex items-center gap-2">
                      <Link2 size={13} className="text-gray-400" />
                      <p className="text-xs text-gray-500">
                        مُعيَّن لـ: {leaveTypes.filter(lt => lt.workflowTemplateId === t.id).map(lt => lt.name).join('، ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ MODAL: مسار جديد ══════════ */}
      <Modal open={open} onClose={() => setOpen(false)} title="إنشاء مسار موافقة جديد" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="اسم المسار" placeholder="مثال: مسار موافقة الإجازة السنوية" {...register('name', { required: true })} />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">خطوات الموافقة (بالترتيب)</p>
              <Button type="button" variant="outline" size="sm"
                onClick={() => append({ stepOrder: fields.length + 1, approverType: 'direct_manager', slaHours: 24 })}>
                <Plus size={13} /> إضافة خطوة
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <select className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    {...register(`steps.${i}.approverType`)}>
                    {Object.entries(APPROVER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <Input placeholder="ساعات SLA" type="number" className="w-28"
                      {...register(`steps.${i}.slaHours`)} />
                    <span className="text-xs text-gray-400 whitespace-nowrap">ساعة</span>
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)}
                      className="text-red-400 hover:text-red-600 p-1 rounded transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs font-medium text-blue-800 mb-2">معاينة المسار:</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">مقدم الطلب</span>
                {fields.map((f, i) => (
                  <>
                    <span key={`arr-${i}`} className="text-blue-300">→</span>
                    <span key={`step-${i}`} className={`text-xs px-2 py-1 rounded ${APPROVER_COLORS[f.approverType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {APPROVER_LABELS[f.approverType] ?? f.approverType}
                    </span>
                  </>
                ))}
                <span className="text-blue-300">→</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">موافَق عليه ✓</span>
              </div>
            </div>
          </div>

          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>إنشاء المسار</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Mini: steps preview ──
function WorkflowStepsPreview({ steps }: { steps: any[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${APPROVER_COLORS[s.approverType] ?? 'bg-gray-100 text-gray-500'}`}>
          {APPROVER_LABELS[s.approverType]?.split(' ')[0] ?? s.approverType}
        </span>
      )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`a${i}`} className="text-gray-300 text-[10px]">→</span>, el], [])}
    </div>
  );
}

// ── Template selector dropdown ──
function TemplateSelector({ templates, onSelect }: { templates: Template[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (templates.length === 0) return <span className="text-xs text-gray-300">لا توجد مسارات</span>;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
        <Link2 size={11} /> تعيين مسار <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 bg-white rounded-xl border border-gray-200 shadow-lg w-56 py-1">
          {templates.map(t => (
            <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
              className="w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <GitBranch size={13} className="text-blue-400" />
              <span className="flex-1">{t.name}</span>
              <span className="text-xs text-gray-400">{t.steps?.length ?? t._count?.steps ?? 0} خطوات</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

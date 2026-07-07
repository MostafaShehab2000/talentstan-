'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Plus, Trash2, GitBranch, ChevronDown, Link2, Check, AlertCircle } from 'lucide-react';

const APPROVER_LABELS: Record<string, string> = {
  direct_manager:  'المدير المباشر',
  department_head: 'مدير الإدارة',
  specific_role:   'دور محدد (HR)',
  specific_user:   'موظف محدد',
};
const APPROVER_COLORS: Record<string, string> = {
  direct_manager:  'bg-blue-100 text-blue-700',
  department_head: 'bg-purple-100 text-purple-700',
  specific_role:   'bg-green-100 text-green-700',
  specific_user:   'bg-orange-100 text-orange-700',
};

const MODULE_LABELS: Record<string, string> = {
  leave:       '🏖️ إجازة',
  permission:  '⏰ إذن',
  mission:     '🚗 مأمورية',
  advance:     '💰 سلفة',
  appraisal:   '⭐ تقييم',
  recruitment: '👤 توظيف',
  helpdesk:    '🎫 دعم فني',
};

// الأنواع التي يتحكم فيها Other Requests
const OTHER_MODULES = ['permission', 'mission', 'advance'] as const;
type OtherModule = typeof OTHER_MODULES[number];

type Template = {
  id: string; name: string; module: string;
  steps?: any[]; _count?: { steps: number };
};
type LeaveType = { id: string; name: string; category: string; workflowTemplateId?: string };
type FormData = {
  name: string;
  module: string;
  steps: { stepOrder: number; approverType: string; slaHours?: number }[];
};

export default function WorkflowPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'assign' | 'templates'>('assign');
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState('');
  const [prefilledModule, setPrefilledModule] = useState('');

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

  // يجيب الـ template المعين لـ module معين
  const getTemplateForModule = (module: string) =>
    templates.find(t => t.module === module);

  const { register, handleSubmit, control, reset, watch, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { name: '', module: 'leave', steps: [{ stepOrder: 1, approverType: 'direct_manager', slaHours: 24 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });
  const watchedSteps = watch('steps');

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/workflow/templates', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-templates'] }); setOpen(false); reset(); },
    onError: (err: any) => {
      const m = err.response?.data?.message;
      setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ'));
    },
  });

  const assignLeaveMut = useMutation({
    mutationFn: ({ typeId, templateId }: { typeId: string; templateId: string | null }) =>
      api.patch(`/leave/types/${typeId}`, { workflowTemplateId: templateId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types-wf'] }),
  });

  // لـ other-request modules، بنعمل template جديد بالـ module المحدد
  // أو بنحذف/نستبدل الـ template الحالي (بتحديد isActive=false ونعمل جديد)
  const openForModule = (module: string) => {
    reset({ name: `مسار ${MODULE_LABELS[module] ?? module}`, module, steps: [{ stepOrder: 1, approverType: 'direct_manager', slaHours: 24 }] });
    setPrefilledModule(module);
    setApiError('');
    setOpen(true);
  };

  const onSubmit = (d: FormData) => {
    createMut.mutate({
      name: d.name,
      module: d.module,
      steps: d.steps.map((s, i) => ({
        stepOrder: i + 1,
        approverType: s.approverType,
        slaHours: s.slaHours ? Number(s.slaHours) : undefined,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">مسارات الموافقة</h2>
          <p className="text-sm text-gray-500 mt-0.5">حدد من يوافق على كل نوع طلب وبأي ترتيب</p>
        </div>
        <Button onClick={() => { reset({ name: '', module: 'leave', steps: [{ stepOrder: 1, approverType: 'direct_manager', slaHours: 24 }] }); setPrefilledModule(''); setApiError(''); setOpen(true); }}>
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

      {/* ══ TAB: تعيين المسارات ══ */}
      {tab === 'assign' && (
        <div className="space-y-5">
          {typesLoading ? <LoadingSkeleton /> : (
            <>
              {/* ── أنواع الإجازات ── */}
              <Section title="🏖️ أنواع الإجازات" subtitle="اختر مسار الموافقة لكل نوع إجازة">
                {leaveTypes.length === 0 ? (
                  <EmptyRow msg="لا توجد أنواع إجازة — أضفها من صفحة الإجازات" />
                ) : leaveTypes.map(lt => {
                  const assigned = templates.find(t => t.id === lt.workflowTemplateId);
                  return (
                    <AssignRow
                      key={lt.id}
                      name={lt.name}
                      subtitle={lt.category === 'leave' ? 'إجازة' : lt.category === 'permission' ? 'إذن' : 'مأمورية'}
                      assigned={assigned}
                      templates={templates}
                      onAssign={(tid) => assignLeaveMut.mutate({ typeId: lt.id, templateId: tid })}
                      onRemove={() => assignLeaveMut.mutate({ typeId: lt.id, templateId: null })}
                      onCreateNew={() => openForModule('leave')}
                    />
                  );
                })}
              </Section>

              {/* ── طلبات أخرى ── */}
              <Section title="📋 طلبات أخرى" subtitle="مسار الموافقة لكل نوع من الطلبات الأخرى">
                {OTHER_MODULES.map(mod => {
                  const assigned = getTemplateForModule(mod);
                  return (
                    <div key={mod} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{MODULE_LABELS[mod]}</p>
                        <p className="text-xs text-gray-400">يُطبَّق تلقائياً على كل طلب من هذا النوع</p>
                      </div>

                      {assigned ? (
                        <div className="flex items-center gap-3">
                          <StepsPreview steps={assigned.steps ?? []} />
                          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> {assigned.name}
                          </span>
                          <button
                            onClick={() => openForModule(mod)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            تعديل
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                            <AlertCircle size={11} /> لا يوجد مسار
                          </span>
                          <Button size="sm" variant="outline" onClick={() => openForModule(mod)}>
                            <Plus size={13} /> إنشاء مسار
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            </>
          )}
        </div>
      )}

      {/* ══ TAB: قوالب المسارات ══ */}
      {tab === 'templates' && (
        <div className="space-y-4">
          {tLoading ? <LoadingSkeleton /> : templates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <GitBranch size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">لا توجد مسارات بعد</p>
              <Button className="mt-4" onClick={() => { reset(); setApiError(''); setOpen(true); }}>
                <Plus size={16} /> مسار جديد
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(t => (
                <div key={t.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                        <GitBranch size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{(t.steps?.length ?? t._count?.steps ?? 0)} خطوات</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {MODULE_LABELS[t.module] ?? t.module}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(t.steps ?? []).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-gray-100 text-xs font-bold text-gray-600 flex items-center justify-center flex-shrink-0">{i + 1}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APPROVER_COLORS[s.approverType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {APPROVER_LABELS[s.approverType] ?? s.approverType}
                        </span>
                        {s.slaHours && <span className="text-xs text-gray-400">خلال {s.slaHours}س</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ Modal: إنشاء مسار ══ */}
      <Modal open={open} onClose={() => setOpen(false)} title="إنشاء مسار موافقة" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم المسار" placeholder="مثال: مسار موافقة الإجازة" {...register('name', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">نوع الطلب</label>
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('module', { required: true })}
              >
                {Object.entries(MODULE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

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
                  <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <select className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    {...register(`steps.${i}.approverType`)}>
                    {Object.entries(APPROVER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <Input placeholder="SLA" type="number" className="w-20" {...register(`steps.${i}.slaHours`)} />
                    <span className="text-xs text-gray-400">ساعة</span>
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-xs font-medium text-blue-700 mb-2">معاينة المسار:</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">مقدم الطلب</span>
                {watchedSteps.map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-blue-300 text-xs">→</span>
                    <span className={`text-xs px-2 py-1 rounded ${APPROVER_COLORS[s.approverType] ?? 'bg-gray-100'}`}>
                      {APPROVER_LABELS[s.approverType] ?? s.approverType}
                    </span>
                  </span>
                ))}
                <span className="text-blue-300 text-xs">→</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">موافَق ✓</span>
              </div>
            </div>
          </div>

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>إنشاء المسار</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Sub-components ──

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function AssignRow({ name, subtitle, assigned, templates, onAssign, onRemove, onCreateNew }: {
  name: string; subtitle: string; assigned?: Template;
  templates: Template[]; onAssign: (id: string) => void;
  onRemove: () => void; onCreateNew: () => void;
}) {
  const leaveTemplates = templates.filter(t => t.module === 'leave');
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      {assigned ? (
        <div className="flex items-center gap-3">
          <StepsPreview steps={assigned.steps ?? []} />
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check size={10} /> {assigned.name}
          </span>
          <button onClick={onRemove} className="text-xs text-red-500 hover:underline">إزالة</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            <AlertCircle size={11} /> بدون مسار
          </span>
          {leaveTemplates.length > 0 ? (
            <TemplateDropdown templates={leaveTemplates} onSelect={onAssign} />
          ) : (
            <Button size="sm" variant="outline" onClick={onCreateNew}><Plus size={13} /> إنشاء مسار</Button>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateDropdown({ templates, onSelect }: { templates: Template[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100">
        <Link2 size={11} /> تعيين مسار <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 bg-white rounded-xl border border-gray-200 shadow-lg w-52 py-1">
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

function StepsPreview({ steps }: { steps: any[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.flatMap((s, i) => [
        i > 0 ? <span key={`a${i}`} className="text-gray-300 text-[10px]">→</span> : null,
        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${APPROVER_COLORS[s.approverType] ?? 'bg-gray-100 text-gray-500'}`}>
          {APPROVER_LABELS[s.approverType]?.split(' ')[0]}
        </span>,
      ]).filter(Boolean)}
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <p className="text-center text-gray-400 py-8 text-sm">{msg}</p>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import {
  Plus, Trash2, BarChart3, ChevronDown, ChevronUp, PlayCircle,
} from 'lucide-react';

const CYCLE_TYPES = [
  { value: 'semi_annual', label: 'نصف سنوي' },
  { value: 'annual', label: 'سنوي' },
];
const SECTION_TYPES = [
  { value: 'kpi', label: 'مؤشرات الأداء (KPI)' },
  { value: 'competency', label: 'الكفاءات' },
  { value: 'discipline', label: 'الانضباط' },
];

type CriterionForm = { criterionName: string; weight: number };
type SectionForm = { sectionType: string; weight: number; criteria: CriterionForm[] };
type TemplateForm = { name: string; cycleType: string; jobTitleId?: string; sections: SectionForm[] };
type CycleForm = { name: string; templateId: string; startDate?: string; endDate?: string };

export default function AppraisalPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'templates' | 'cycles' | 'results'>('templates');
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openCycle, setOpenCycle] = useState(false);
  const [bellCycleId, setBellCycleId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const { data: templates = [], isLoading: tLoading } = useQuery({
    queryKey: ['appraisal-templates'],
    queryFn: () => api.get('/appraisal/templates').then(r => r.data),
  });
  const { data: cycles = [], isLoading: cLoading } = useQuery({
    queryKey: ['appraisal-cycles'],
    queryFn: () => api.get('/appraisal/cycles').then(r => r.data),
  });
  const { data: appraisals } = useQuery({
    queryKey: ['appraisals-all'],
    queryFn: () => api.get('/appraisal/all').then(r => r.data),
  });
  const { data: bellData } = useQuery({
    queryKey: ['bell-curve', bellCycleId],
    queryFn: () => bellCycleId ? api.get(`/appraisal/cycles/${bellCycleId}/bell-curve`).then(r => r.data) : null,
    enabled: !!bellCycleId,
  });
  const { data: jtRaw } = useQuery({ queryKey: ['job-titles'], queryFn: () => api.get('/job-titles').then(r => r.data) });
  const jobTitles: any[] = Array.isArray(jtRaw) ? jtRaw : (jtRaw as any)?.data ?? [];

  // ── Template form ──
  const templateForm = useForm<TemplateForm>({
    defaultValues: {
      name: '', cycleType: 'annual', jobTitleId: '',
      sections: [{ sectionType: 'kpi', weight: 60, criteria: [{ criterionName: '', weight: 100 }] }],
    },
  });
  const { fields: sections, append: addSection, remove: removeSection } = useFieldArray({
    control: templateForm.control, name: 'sections',
  });

  const templateMut = useMutation({
    mutationFn: (body: any) => api.post('/appraisal/templates', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appraisal-templates'] }); setOpenTemplate(false); templateForm.reset(); },
  });

  const onSubmitTemplate = (d: TemplateForm) => {
    const body = {
      name: d.name,
      cycleType: d.cycleType,
      jobTitleId: d.jobTitleId || undefined,
      sections: d.sections.map(s => ({
        sectionType: s.sectionType,
        weight: +s.weight,
        criteria: s.criteria.map(c => ({ criterionName: c.criterionName, weight: +c.weight })),
      })),
    };
    templateMut.mutate(body);
  };

  // ── Cycle form ──
  const cycleForm = useForm<CycleForm>({ defaultValues: { name: '', templateId: '' } });
  const cycleMut = useMutation({
    mutationFn: (body: any) => api.post('/appraisal/cycles', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appraisal-cycles'] }); setOpenCycle(false); cycleForm.reset(); },
  });

  const employees: any[] = (appraisals as any)?.data ?? [];

  const tabs = [
    { id: 'templates', label: 'قوالب التقييم' },
    { id: 'cycles', label: 'دورات التقييم' },
    { id: 'results', label: 'النتائج والتقارير' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">التقييم الوظيفي</h2>
        <div className="flex gap-2">
          {tab === 'templates' && (
            <Button onClick={() => setOpenTemplate(true)}><Plus size={16} /> قالب جديد</Button>
          )}
          {tab === 'cycles' && (
            <Button onClick={() => setOpenCycle(true)} disabled={(templates as any[]).length === 0}>
              <PlayCircle size={16} /> إطلاق دورة
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TEMPLATES TAB ── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          {tLoading ? <p className="text-sm text-gray-400 py-8 text-center">جارٍ التحميل…</p>
            : (templates as any[]).length === 0
              ? <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
                  <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">لا توجد قوالب. أنشئ قالباً لتبدأ.</p>
                  <Button className="mt-4" onClick={() => setOpenTemplate(true)}><Plus size={15} /> قالب جديد</Button>
                </div>
              : (templates as any[]).map((t: any) => (
                <div key={t.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}>
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {CYCLE_TYPES.find(c => c.value === t.cycleType)?.label}
                        {t.jobTitle ? ` • ${t.jobTitle.title}` : ' • كل المسميات'}
                        {' • '}{(t.sections ?? []).length} أقسام
                      </p>
                    </div>
                    {expandedTemplate === t.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                  {expandedTemplate === t.id && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      {(t.sections ?? []).map((s: any, si: number) => (
                        <div key={si} className="rounded-lg bg-gray-50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-800">
                              {SECTION_TYPES.find(st => st.value === s.sectionType)?.label ?? s.sectionType}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">وزن: {s.weight}%</span>
                          </div>
                          <div className="space-y-1.5">
                            {(s.criteria ?? []).map((c: any, ci: number) => (
                              <div key={ci} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{c.criterionName}</span>
                                <span className="text-gray-400 text-xs">{c.weight}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          }
        </div>
      )}

      {/* ── CYCLES TAB ── */}
      {tab === 'cycles' && (
        <div className="space-y-4">
          {cLoading ? <p className="text-sm text-gray-400 py-8 text-center">جارٍ التحميل…</p>
            : (cycles as any[]).length === 0
              ? <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
                  <p className="text-sm text-gray-400">لا توجد دورات. اضغط "إطلاق دورة" للبدء.</p>
                </div>
              : <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">اسم الدورة</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">الفترة</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">التقييمات</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(cycles as any[]).map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {c.startDate ? formatDate(c.startDate) : '—'} → {c.endDate ? formatDate(c.endDate) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-blue-700 font-semibold">{c._count?.appraisals ?? 0}</span> تقييم
                          </td>
                          <td className="px-4 py-3"><Badge status={c.status} /></td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => { setBellCycleId(c.id); setTab('results'); }}>
                              <BarChart3 size={13} /> Bell Curve
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          }
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {tab === 'results' && (
        <div className="space-y-4">
          {/* Cycle selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">اختر الدورة:</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={bellCycleId ?? ''}
              onChange={e => setBellCycleId(e.target.value || null)}>
              <option value="">— اختر دورة —</option>
              {(cycles as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Bell curve */}
          {bellCycleId && bellData && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">توزيع التقييمات — Bell Curve</h3>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-2xl font-bold text-blue-700">{bellData.avg?.toFixed(1) ?? '—'}</p>
                  <p className="text-gray-500 text-xs">المتوسط</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <p className="text-2xl font-bold text-purple-700">{bellData.stdDev?.toFixed(1) ?? '—'}</p>
                  <p className="text-gray-500 text-xs">الانحراف المعياري</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-2xl font-bold text-green-700">{bellData.employees?.length ?? 0}</p>
                  <p className="text-gray-500 text-xs">موظف</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {bellData.distribution?.map((d: any) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-gray-600 text-right">{d.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                      <div className="bg-blue-500 h-4 rounded-full transition-all"
                        style={{ width: `${Math.round((d.count / (bellData.employees?.length || 1)) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-sm font-bold text-gray-700 text-center">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All appraisals table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">جميع التقييمات</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الدورة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">تقييم ذاتي</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">تقييم المدير</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">النهائي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.length === 0
                  ? <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm">لا توجد تقييمات</td></tr>
                  : employees.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.employee?.fullName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{a.cycle?.name ?? '—'}</td>
                      <td className="px-4 py-3"><Badge status={a.status} /></td>
                      <td className="px-4 py-3">{a.selfScore != null ? (+a.selfScore).toFixed(1) : '—'}</td>
                      <td className="px-4 py-3">{a.managerScore != null ? (+a.managerScore).toFixed(1) : '—'}</td>
                      <td className="px-4 py-3">
                        {a.finalScore != null
                          ? <span className="font-bold text-blue-700">{(+a.finalScore).toFixed(1)}</span>
                          : '—'}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Template Modal ── */}
      <Modal open={openTemplate} onClose={() => setOpenTemplate(false)} title="إنشاء قالب تقييم" size="xl">
        <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم القالب" {...templateForm.register('name', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">نوع الدورة</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...templateForm.register('cycleType')}>
                {CYCLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-sm font-medium text-gray-700">المسمى الوظيفي (اختياري — اتركه فارغاً لتطبيقه على الكل)</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...templateForm.register('jobTitleId')}>
                <option value="">— كل المسميات —</option>
                {jobTitles.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">أقسام التقييم</h3>
              <Button type="button" size="sm" variant="outline"
                onClick={() => addSection({ sectionType: 'kpi', weight: 20, criteria: [{ criterionName: '', weight: 100 }] })}>
                <Plus size={14} /> إضافة قسم
              </Button>
            </div>

            {sections.map((section, si) => (
              <SectionEditor key={section.id} sectionIndex={si} form={templateForm} onRemove={() => removeSection(si)} />
            ))}
          </div>

          {templateMut.error && (
            <p className="text-sm text-red-600">{(templateMut.error as any)?.response?.data?.message ?? 'حدث خطأ'}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenTemplate(false)}>إلغاء</Button>
            <Button type="submit" loading={templateMut.isPending}>حفظ القالب</Button>
          </div>
        </form>
      </Modal>

      {/* ── Launch Cycle Modal ── */}
      <Modal open={openCycle} onClose={() => setOpenCycle(false)} title="إطلاق دورة تقييم" size="md">
        <form onSubmit={cycleForm.handleSubmit(d => cycleMut.mutate(d))} className="space-y-4">
          <Input label="اسم الدورة" {...cycleForm.register('name', { required: true })} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">القالب</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...cycleForm.register('templateId', { required: true })}>
              <option value="">— اختر قالباً —</option>
              {(templates as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ البداية" type="date" {...cycleForm.register('startDate')} />
            <Input label="تاريخ النهاية" type="date" {...cycleForm.register('endDate')} />
          </div>
          {cycleMut.error && (
            <p className="text-sm text-red-600">{(cycleMut.error as any)?.response?.data?.message ?? 'حدث خطأ'}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenCycle(false)}>إلغاء</Button>
            <Button type="submit" loading={cycleMut.isPending}>إطلاق</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Section editor sub-component
function SectionEditor({ sectionIndex, form, onRemove }: { sectionIndex: number; form: any; onRemove: () => void }) {
  const { fields: criteria, append, remove } = useFieldArray({
    control: form.control,
    name: `sections.${sectionIndex}.criteria`,
  });

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">نوع القسم</label>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register(`sections.${sectionIndex}.sectionType`)}>
            {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-28">
          <label className="text-xs text-gray-500">الوزن (%)</label>
          <input type="number" min="1" max="100"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register(`sections.${sectionIndex}.weight`)} />
        </div>
        <button type="button" onClick={onRemove} className="mt-5 text-red-400 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-2 pr-2 border-r-2 border-gray-100">
        <p className="text-xs font-medium text-gray-500">المعايير</p>
        {criteria.map((_c, ci) => (
          <div key={_c.id} className="flex items-center gap-2">
            <input type="text" placeholder="اسم المعيار"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...form.register(`sections.${sectionIndex}.criteria.${ci}.criterionName`)} />
            <input type="number" min="1" max="100" placeholder="وزن%"
              className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...form.register(`sections.${sectionIndex}.criteria.${ci}.weight`)} />
            {criteria.length > 1 && (
              <button type="button" onClick={() => remove(ci)} className="text-red-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline"
          onClick={() => append({ criterionName: '', weight: 0 })}>
          <Plus size={12} /> معيار
        </Button>
      </div>
    </div>
  );
}

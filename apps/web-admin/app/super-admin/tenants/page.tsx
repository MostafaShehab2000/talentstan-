'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import {
  Plus, Power, Eye, Users, Calendar, CheckCircle, AlertTriangle,
  Edit2, LayoutDashboard, FolderTree, Briefcase, GitBranch,
  CalendarDays, FileText, ClipboardList, BarChart3, MessageSquare,
  HelpCircle, X,
} from 'lucide-react';
import type { Tenant } from '@/types';

const TENANT_TYPES = ['company', 'hospital', 'education', 'other'] as const;
const SUBSCRIPTION_PLANS = ['basic', 'professional', 'enterprise'] as const;

const TYPE_LABELS: Record<string, string> = {
  company: 'شركة', hospital: 'مستشفى', education: 'تعليم', other: 'أخرى',
};
const PLAN_LABELS: Record<string, string> = {
  basic: 'أساسي', professional: 'احترافي', enterprise: 'مؤسسي',
};
const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-700 border-gray-300',
  professional: 'bg-blue-100 text-blue-700 border-blue-300',
  enterprise: 'bg-purple-100 text-purple-700 border-purple-300',
};
const PLAN_SELECTED_COLORS: Record<string, string> = {
  basic: 'border-gray-500 bg-gray-50 ring-2 ring-gray-400',
  professional: 'border-blue-500 bg-blue-50 ring-2 ring-blue-400',
  enterprise: 'border-purple-500 bg-purple-50 ring-2 ring-purple-400',
};

// مودولات كل خطة مع أيقوناتها
const PLAN_MODULES: Record<string, { label: string; icon: React.ReactNode; included: boolean }[]> = {
  basic: [
    { label: 'إدارة الموظفين', icon: <Users size={14} />, included: true },
    { label: 'الأقسام والمسميات', icon: <FolderTree size={14} />, included: true },
    { label: 'الإجازات والأذونات', icon: <CalendarDays size={14} />, included: true },
    { label: 'كشوف الرواتب', icon: <FileText size={14} />, included: true },
    { label: 'مسارات الموافقة', icon: <GitBranch size={14} />, included: false },
    { label: 'التوظيف', icon: <Briefcase size={14} />, included: false },
    { label: 'الاستطلاعات', icon: <ClipboardList size={14} />, included: false },
    { label: 'التواصل الداخلي', icon: <MessageSquare size={14} />, included: false },
    { label: 'الدعم الفني', icon: <HelpCircle size={14} />, included: false },
    { label: 'التقييمات + KPIs', icon: <BarChart3 size={14} />, included: false },
  ],
  professional: [
    { label: 'إدارة الموظفين', icon: <Users size={14} />, included: true },
    { label: 'الأقسام والمسميات', icon: <FolderTree size={14} />, included: true },
    { label: 'الإجازات والأذونات', icon: <CalendarDays size={14} />, included: true },
    { label: 'كشوف الرواتب', icon: <FileText size={14} />, included: true },
    { label: 'مسارات الموافقة', icon: <GitBranch size={14} />, included: true },
    { label: 'التوظيف', icon: <Briefcase size={14} />, included: true },
    { label: 'الاستطلاعات', icon: <ClipboardList size={14} />, included: true },
    { label: 'التواصل الداخلي', icon: <MessageSquare size={14} />, included: true },
    { label: 'الدعم الفني', icon: <HelpCircle size={14} />, included: true },
    { label: 'التقييمات + KPIs', icon: <BarChart3 size={14} />, included: false },
  ],
  enterprise: [
    { label: 'إدارة الموظفين', icon: <Users size={14} />, included: true },
    { label: 'الأقسام والمسميات', icon: <FolderTree size={14} />, included: true },
    { label: 'الإجازات والأذونات', icon: <CalendarDays size={14} />, included: true },
    { label: 'كشوف الرواتب', icon: <FileText size={14} />, included: true },
    { label: 'مسارات الموافقة', icon: <GitBranch size={14} />, included: true },
    { label: 'التوظيف', icon: <Briefcase size={14} />, included: true },
    { label: 'الاستطلاعات', icon: <ClipboardList size={14} />, included: true },
    { label: 'التواصل الداخلي', icon: <MessageSquare size={14} />, included: true },
    { label: 'الدعم الفني', icon: <HelpCircle size={14} />, included: true },
    { label: 'التقييمات + KPIs', icon: <BarChart3 size={14} />, included: true },
  ],
};

const PLAN_MAX_EMPLOYEES: Record<string, number> = {
  basic: 50,
  professional: 200,
  enterprise: 9999,
};

function daysRemaining(endDate?: string): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// مكوّن اختيار الخطة مع عرض المودولات
function PlanSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (plan: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">خطة الاشتراك</label>
      <div className="grid grid-cols-3 gap-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = value === plan;
          const modules = PLAN_MODULES[plan];
          const included = modules.filter((m) => m.included);
          const excluded = modules.filter((m) => !m.included);
          return (
            <button
              key={plan}
              type="button"
              onClick={() => onChange(plan)}
              className={`rounded-xl border-2 p-3 text-right transition-all ${
                isSelected ? PLAN_SELECTED_COLORS[plan] : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`text-sm font-bold mb-2 ${isSelected ? '' : 'text-gray-700'}`}>
                {PLAN_LABELS[plan]}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {plan === 'enterprise' ? 'غير محدود' : `حتى ${PLAN_MAX_EMPLOYEES[plan]} موظف`}
              </p>
              <div className="space-y-1">
                {included.map((m, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle size={10} className="flex-shrink-0" /> {m.label}
                  </div>
                ))}
                {excluded.map((m, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-gray-300">
                    <X size={10} className="flex-shrink-0" /> {m.label}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// — Schemas —
const createSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  type: z.enum(TENANT_TYPES),
  maxEmployees: z.coerce.number().min(1),
  subscriptionPlan: z.enum(SUBSCRIPTION_PLANS),
  subscriptionEnd: z.string().optional(),
  adminName: z.string().min(2, 'اسم المسؤول مطلوب'),
  adminEmail: z.string().email('بريد غير صالح'),
  adminPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
});
type CreateFormData = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  type: z.enum(TENANT_TYPES),
  maxEmployees: z.coerce.number().min(1),
  subscriptionPlan: z.enum(SUBSCRIPTION_PLANS),
  subscriptionEnd: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

export default function TenantsPage() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<Tenant | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/super-admin/tenants').then((r) => r.data),
  });

  const allTenants: Tenant[] = data?.data ?? [];
  const tenants = allTenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  // — Create form —
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: { maxEmployees: 50, type: 'company', subscriptionPlan: 'professional' },
  });
  const createPlan = createForm.watch('subscriptionPlan');

  // — Edit form —
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as any,
  });
  const editPlan = editForm.watch('subscriptionPlan');

  const openEdit = (t: Tenant) => {
    editForm.reset({
      name: t.name,
      type: (t.type as any) ?? 'company',
      maxEmployees: t.maxEmployees,
      subscriptionPlan: (t.subscriptionPlan as any) ?? 'professional',
      subscriptionEnd: t.subscriptionEnd ? t.subscriptionEnd.slice(0, 10) : '',
    });
    setEditTenant(t);
    setDetailTenant(null);
  };

  // — Mutations —
  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/super-admin/tenants', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); setOpenCreate(false); createForm.reset(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.patch(`/super-admin/tenants/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); setEditTenant(null); },
  });

  const activateMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/tenants/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const suspendMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/tenants/${id}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); setConfirmSuspend(null); },
  });

  // — Stats —
  const active = allTenants.filter((t) => t.status === 'active').length;
  const trial = allTenants.filter((t) => t.status === 'trial').length;
  const expiringSoon = allTenants.filter((t) => {
    const d = daysRemaining(t.subscriptionEnd);
    return d !== null && d <= 30 && d >= 0;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">إدارة الشركات</h2>
        <Button onClick={() => setOpenCreate(true)}><Plus size={16} /> شركة جديدة</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div><p className="text-2xl font-bold text-gray-900">{active}</p><p className="text-xs text-gray-500">نشطة</p></div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <Power size={20} className="text-yellow-600" />
          </div>
          <div><p className="text-2xl font-bold text-gray-900">{trial}</p><p className="text-xs text-gray-500">تجريبية</p></div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div><p className="text-2xl font-bold text-gray-900">{expiringSoon}</p><p className="text-xs text-gray-500">تنتهي خلال 30 يوم</p></div>
        </div>
      </div>

      {/* Search */}
      <Input placeholder="بحث بالاسم…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : tenants.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">لا توجد شركات</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الشركة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الخطة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الموظفون</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">انتهاء الاشتراك</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => {
                const days = daysRemaining(t.subscriptionEnd);
                const isActive = t.status === 'active';
                const isTrial = t.status === 'trial';
                const isSuspended = t.status === 'suspended';
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{TYPE_LABELS[t.type] ?? t.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_COLORS[t.subscriptionPlan]?.replace('border-gray-300', '').replace('border-blue-300', '').replace('border-purple-300', '') ?? 'bg-gray-100 text-gray-700'}`}>
                        {PLAN_LABELS[t.subscriptionPlan] ?? t.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-gray-400" />
                        <span>{t._count?.employees ?? 0} / {t.maxEmployees === 9999 ? '∞' : t.maxEmployees}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge status={t.status} /></td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-700">{formatDate(t.subscriptionEnd)}</p>
                        {days !== null && (
                          <p className={`text-xs ${days <= 7 ? 'text-red-500 font-medium' : days <= 30 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {days > 0 ? `${days} يوم متبقي` : 'منتهي'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetailTenant(t)}>
                          <Eye size={13} /> تفاصيل
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                          <Edit2 size={13} /> تعديل
                        </Button>
                        {(isTrial || isSuspended) && (
                          <Button size="sm" variant="success" loading={activateMut.isPending}
                            onClick={() => activateMut.mutate(t.id)}>
                            <Power size={13} /> تفعيل
                          </Button>
                        )}
                        {isActive && (
                          <Button size="sm" variant="danger" onClick={() => setConfirmSuspend(t)}>
                            <Power size={13} /> تعليق
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      <Modal open={!!detailTenant} onClose={() => setDetailTenant(null)} title={detailTenant?.name ?? ''} size="lg">
        {detailTenant && (
          <div className="space-y-5">
            {/* Plan modules */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-800">
                  خطة {PLAN_LABELS[detailTenant.subscriptionPlan]}
                </span>
                <Badge status={detailTenant.status} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PLAN_MODULES[detailTenant.subscriptionPlan]?.map((m, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${m.included ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                    {m.included
                      ? <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                      : <X size={12} className="text-gray-300 flex-shrink-0" />
                    }
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={15} className="text-gray-400" />
                  <span>الموظفون: <strong>{detailTenant._count?.employees ?? 0} / {detailTenant.maxEmployees === 9999 ? '∞' : detailTenant.maxEmployees}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={15} className="text-gray-400" />
                  <span>انتهاء الاشتراك: <strong>{formatDate(detailTenant.subscriptionEnd)}</strong></span>
                </div>
              </div>
              <div>
                {(() => {
                  const d = daysRemaining(detailTenant.subscriptionEnd);
                  return d !== null && (
                    <div className={`rounded-lg p-3 text-center ${d <= 7 ? 'bg-red-50 text-red-700' : d <= 30 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                      <p className="text-2xl font-bold">{d > 0 ? d : 0}</p>
                      <p className="text-xs">{d > 0 ? 'يوم متبقي' : 'الاشتراك منتهي'}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => openEdit(detailTenant)}>
                <Edit2 size={14} /> تعديل البيانات
              </Button>
              {detailTenant.status !== 'active' && (
                <Button variant="success" onClick={() => { activateMut.mutate(detailTenant.id); setDetailTenant(null); }}>
                  <Power size={14} /> تفعيل
                </Button>
              )}
              {detailTenant.status === 'active' && (
                <Button variant="danger" onClick={() => { setDetailTenant(null); setConfirmSuspend(detailTenant); }}>
                  <Power size={14} /> تعليق
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Edit Modal ─── */}
      <Modal open={!!editTenant} onClose={() => setEditTenant(null)} title={`تعديل: ${editTenant?.name ?? ''}`} size="xl">
        <form
          onSubmit={editForm.handleSubmit((d) =>
            updateMut.mutate({ id: editTenant!.id, body: d })
          )}
          className="space-y-5"
        >
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم الشركة" error={editForm.formState.errors.name?.message} {...editForm.register('name')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">نوع الجهة</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...editForm.register('type')}>
                {TENANT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <Input label="الحد الأقصى للموظفين" type="number" error={editForm.formState.errors.maxEmployees?.message} {...editForm.register('maxEmployees')} />
            <Input label="تاريخ انتهاء الاشتراك" type="date" {...editForm.register('subscriptionEnd')} />
          </div>

          {/* Plan selector */}
          <PlanSelector
            value={editPlan}
            onChange={(plan) => {
              editForm.setValue('subscriptionPlan', plan as any);
              editForm.setValue('maxEmployees', PLAN_MAX_EMPLOYEES[plan]);
            }}
          />

          {updateMut.error && (
            <p className="text-sm text-red-600">
              {(updateMut.error as any)?.response?.data?.message ?? 'حدث خطأ'}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setEditTenant(null)}>إلغاء</Button>
            <Button type="submit" loading={updateMut.isPending}>حفظ التعديلات</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Confirm Suspend ─── */}
      <Modal open={!!confirmSuspend} onClose={() => setConfirmSuspend(null)} title="تأكيد تعليق الشركة">
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="font-medium text-red-800">⚠️ هل أنت متأكد من تعليق <strong>{confirmSuspend?.name}</strong>؟</p>
            <p className="text-sm text-red-600 mt-1">لن يتمكن الموظفون من الدخول للنظام حتى يتم إعادة التفعيل.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmSuspend(null)}>إلغاء</Button>
            <Button variant="danger" loading={suspendMut.isPending}
              onClick={() => confirmSuspend && suspendMut.mutate(confirmSuspend.id)}>
              تعليق
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Create Modal ─── */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="إضافة شركة جديدة" size="xl">
        <form onSubmit={createForm.handleSubmit((d) => createMut.mutate(d as any))} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم الشركة" error={createForm.formState.errors.name?.message} {...createForm.register('name')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">نوع الجهة</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...createForm.register('type')}>
                {TENANT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <Input label="الحد الأقصى للموظفين" type="number" error={createForm.formState.errors.maxEmployees?.message} {...createForm.register('maxEmployees')} />
            <Input label="تاريخ انتهاء الاشتراك" type="date" {...createForm.register('subscriptionEnd')} />
          </div>

          {/* Plan selector */}
          <PlanSelector
            value={createPlan}
            onChange={(plan) => {
              createForm.setValue('subscriptionPlan', plan as any);
              createForm.setValue('maxEmployees', PLAN_MAX_EMPLOYEES[plan]);
            }}
          />

          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">بيانات مسؤول HR الأول</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" error={createForm.formState.errors.adminName?.message} {...createForm.register('adminName')} />
            <Input label="البريد الإلكتروني" type="email" error={createForm.formState.errors.adminEmail?.message} {...createForm.register('adminEmail')} />
            <Input label="كلمة المرور" type="password" error={createForm.formState.errors.adminPassword?.message} {...createForm.register('adminPassword')} />
          </div>

          {createMut.error && (
            <p className="text-sm text-red-600">
              {Array.isArray((createMut.error as any)?.response?.data?.message)
                ? (createMut.error as any).response.data.message.join(' — ')
                : (createMut.error as any)?.response?.data?.message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenCreate(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={createForm.formState.isSubmitting || createMut.isPending}>إنشاء</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

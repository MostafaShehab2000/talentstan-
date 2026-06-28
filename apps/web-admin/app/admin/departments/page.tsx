'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, FolderTree, Pencil, Trash2, Building2, Layers } from 'lucide-react';

type Dept = {
  id: string;
  name: string;
  parentDepartmentId?: string | null;
  headEmployee?: { fullName: string } | null;
  parentDepartment?: { name: string } | null;
  children?: Dept[];
  activeEmployees?: number;
  _count?: { employees: number; children: number };
};

type FormData = { name: string; parentDepartmentId?: string };

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');

  const { data: departments = [], isLoading } = useQuery<Dept[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormData>();

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', parentDepartmentId: '' });
    setApiError('');
    setOpen(true);
  };

  const openEdit = (d: Dept) => {
    setEditing(d);
    reset({ name: d.name, parentDepartmentId: d.parentDepartment ? '' : '' });
    setApiError('');
    setOpen(true);
  };

  const createMut = useMutation({
    mutationFn: (body: FormData) => api.post('/departments', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setOpen(false); reset(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg.join(' — ') : (msg ?? 'حدث خطأ'));
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: FormData }) => api.patch(`/departments/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setOpen(false); reset(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg.join(' — ') : (msg ?? 'حدث خطأ'));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setDeleteId(null); },
  });

  const onSubmit = (data: FormData) => {
    const body: FormData = { name: data.name };
    if (data.parentDepartmentId) body.parentDepartmentId = data.parentDepartmentId;
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  };

  // API returns tree: [{...dept, children: [...subDepts]}]
  const topDepts: Dept[] = Array.isArray(departments) ? departments : (departments as any)?.data ?? [];
  const depts = topDepts; // alias for modal selects

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">الهيكل التنظيمي</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة → قسم (الأقسام الفرعية تابعة للإدارات)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate} variant="outline"><Plus size={16} /> قسم فرعي</Button>
          <Button onClick={openCreate}><Plus size={16} /> إدارة جديدة</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Building2 className="text-blue-600" size={24} />
          <div><div className="text-2xl font-bold text-blue-700">{topDepts.length}</div><div className="text-sm text-blue-600">إدارة</div></div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <Layers className="text-purple-600" size={24} />
          <div><div className="text-2xl font-bold text-purple-700">{topDepts.reduce((s, d) => s + (d.children?.length ?? 0), 0)}</div><div className="text-sm text-purple-600">قسم فرعي</div></div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <FolderTree className="text-green-600" size={24} />
          <div><div className="text-2xl font-bold text-green-700">{topDepts.length + topDepts.reduce((s, d) => s + (d.children?.length ?? 0), 0)}</div><div className="text-sm text-green-600">إجمالي</div></div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : topDepts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400 text-sm">لا توجد إدارات — ابدأ بإضافة إدارة جديدة</div>
        ) : topDepts.map(dept => {
          const children = dept.children ?? [];
          return (
            <div key={dept.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Department Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-blue-900 text-base">{dept.name}</span>
                    <span className="mr-2 text-xs text-blue-500">إدارة · {dept._count?.employees ?? 0} موظف</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(dept)}><Pencil size={12} /> تعديل</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(dept.id)}><Trash2 size={12} /></Button>
                </div>
              </div>

              {/* Sub-departments */}
              {children.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {children.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-4 border-l-2 border-b-2 border-gray-300 h-4 mr-4 rounded-bl" />
                        <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
                          <Layers size={13} className="text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{sub.name}</span>
                        <span className="text-xs text-gray-400">{sub._count?.employees ?? 0} موظف</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(sub)}><Pencil size={12} /> تعديل</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(sub.id)}><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-2 text-xs text-gray-400 italic">لا توجد أقسام فرعية</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل' : 'إضافة إدارة أو قسم'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="الاسم" placeholder="مثال: إدارة الموارد البشرية" {...register('name', { required: true })} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              تابع لإدارة <span className="text-xs text-gray-400">(اتركه فارغاً لو إدارة رئيسية)</span>
            </label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('parentDepartmentId')}
            >
              <option value="">— إدارة رئيسية (بدون أب) —</option>
              {topDepts.filter(d => d.id !== editing?.id).map(d => (
                <option key={d.id} value={d.id}>↳ قسم داخل: {d.name}</option>
              ))}
            </select>
          </div>

          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending || updateMut.isPending}>
              {editing ? 'تحديث' : 'حفظ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
        <p className="text-sm text-gray-600 mb-4">هل أنت متأكد من حذف هذا القسم؟</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button
            variant="danger"
            loading={deleteMut.isPending}
            onClick={() => deleteId && deleteMut.mutate(deleteId)}
          >
            حذف
          </Button>
        </div>
      </Modal>
    </div>
  );
}

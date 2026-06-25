'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, FolderTree, Pencil, Trash2 } from 'lucide-react';

type Dept = {
  id: string;
  name: string;
  headEmployee?: { fullName: string } | null;
  parentDepartment?: { name: string } | null;
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

  const depts: Dept[] = Array.isArray(departments) ? departments : (departments as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">الأقسام</h2>
        <Button onClick={openCreate}><Plus size={16} /> قسم جديد</Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>القسم</Th>
                <Th>القسم الأب</Th>
                <Th>المدير</Th>
                <Th>الموظفون</Th>
                <Th>إجراءات</Th>
              </tr>
            </Thead>
            <Tbody>
              {depts.length === 0 ? (
                <EmptyState />
              ) : depts.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <FolderTree size={16} className="text-blue-400" />
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </Td>
                  <Td>{d.parentDepartment?.name ?? '—'}</Td>
                  <Td>{d.headEmployee?.fullName ?? '—'}</Td>
                  <Td>{d._count?.employees ?? 0}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                        <Pencil size={13} /> تعديل
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteId(d.id)}>
                        <Trash2 size={13} /> حذف
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل القسم' : 'إضافة قسم جديد'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="اسم القسم" {...register('name', { required: true })} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">القسم الأب (اختياري)</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('parentDepartmentId')}
            >
              <option value="">— بدون قسم أب —</option>
              {depts.filter(d => d.id !== editing?.id).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
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

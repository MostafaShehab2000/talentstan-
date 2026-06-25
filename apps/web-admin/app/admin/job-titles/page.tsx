'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';

type JobTitle = {
  id: string;
  title: string;
  gradeLevel?: number | null;
  _count?: { employees: number };
};

type FormData = { title: string; gradeLevel?: string };

export default function JobTitlesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobTitle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');

  const { data: jobTitles = [], isLoading } = useQuery<JobTitle[]>({
    queryKey: ['job-titles'],
    queryFn: () => api.get('/job-titles').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>();

  const openCreate = () => {
    setEditing(null);
    reset({ title: '', gradeLevel: '' });
    setApiError('');
    setOpen(true);
  };

  const openEdit = (jt: JobTitle) => {
    setEditing(jt);
    reset({ title: jt.title, gradeLevel: jt.gradeLevel?.toString() ?? '' });
    setApiError('');
    setOpen(true);
  };

  const buildBody = (data: FormData) => ({
    title: data.title,
    ...(data.gradeLevel ? { gradeLevel: Number(data.gradeLevel) } : {}),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/job-titles', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-titles'] }); setOpen(false); reset(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg.join(' — ') : (msg ?? 'حدث خطأ'));
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/job-titles/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-titles'] }); setOpen(false); reset(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg.join(' — ') : (msg ?? 'حدث خطأ'));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/job-titles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-titles'] }); setDeleteId(null); },
  });

  const onSubmit = (data: FormData) => {
    const body = buildBody(data);
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  };

  const list: JobTitle[] = Array.isArray(jobTitles) ? jobTitles : (jobTitles as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">المسميات الوظيفية</h2>
        <Button onClick={openCreate}><Plus size={16} /> مسمى جديد</Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>المسمى الوظيفي</Th>
                <Th>الدرجة الوظيفية</Th>
                <Th>عدد الموظفين</Th>
                <Th>إجراءات</Th>
              </tr>
            </Thead>
            <Tbody>
              {list.length === 0 ? (
                <EmptyState />
              ) : list.map((jt) => (
                <Tr key={jt.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-blue-400" />
                      <span className="font-medium text-gray-900">{jt.title}</span>
                    </div>
                  </Td>
                  <Td>
                    {jt.gradeLevel ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        درجة {jt.gradeLevel}
                      </span>
                    ) : '—'}
                  </Td>
                  <Td>{jt._count?.employees ?? 0} موظف</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(jt)}>
                        <Pencil size={13} /> تعديل
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteId(jt.id)}
                        disabled={(jt._count?.employees ?? 0) > 0}>
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
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي جديد'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="المسمى الوظيفي" placeholder="مثال: مدير تطوير البرمجيات" {...register('title', { required: true })} />
          <Input label="الدرجة الوظيفية (اختياري)" type="number" placeholder="مثال: 5" {...register('gradeLevel')} />

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
        <p className="text-sm text-gray-600 mb-4">هل أنت متأكد من حذف هذا المسمى الوظيفي؟</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button variant="danger" loading={deleteMut.isPending}
            onClick={() => deleteId && deleteMut.mutate(deleteId)}>
            حذف
          </Button>
        </div>
      </Modal>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Plus, FolderTree } from 'lucide-react';
import type { Department } from '@/types';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  parentId: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (body: FormData) => api.post('/departments', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setOpen(false); reset(); },
  });

  const depts: Department[] = departments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">الأقسام</h2>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> قسم جديد</Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>القسم</Th>
                <Th>الكود</Th>
                <Th>المدير</Th>
                <Th>الموظفون</Th>
                <Th>أقسام فرعية</Th>
              </tr>
            </Thead>
            <Tbody>
              {depts.length === 0 ? <EmptyState /> : depts.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <FolderTree size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </Td>
                  <Td><span className="font-mono text-xs">{d.code ?? '—'}</span></Td>
                  <Td>{d.manager?.fullName ?? '—'}</Td>
                  <Td>{d._count?.employees ?? 0}</Td>
                  <Td>{d._count?.children ?? 0}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة قسم جديد">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <Input label="اسم القسم" error={errors.name?.message} {...register('name')} />
          <Input label="الكود (اختياري)" error={errors.code?.message} {...register('code')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

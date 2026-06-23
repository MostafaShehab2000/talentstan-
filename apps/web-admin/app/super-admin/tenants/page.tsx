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
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { Plus, Power, Trash2 } from 'lucide-react';
import type { Tenant } from '@/types';

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'أحرف صغيرة وأرقام وشرطة فقط'),
  maxEmployees: z.coerce.number().min(1),
  subscriptionExpiresAt: z.string().optional(),
  adminFullName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

export default function TenantsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/tenants').then((r) => r.data),
  });
  const tenants: Tenant[] = (data?.data ?? []).filter((t: Tenant) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search),
  );

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { maxEmployees: 50 },
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/tenants', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); setOpen(false); reset(); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tenants/${id}/${status === 'active' ? 'suspend' : 'activate'}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">إدارة الشركات</h2>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> شركة جديدة</Button>
      </div>

      <Input placeholder="بحث بالاسم أو الـ slug…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>الشركة</Th>
                <Th>الموظفون</Th>
                <Th>الحالة</Th>
                <Th>الاشتراك</Th>
                <Th>إجراءات</Th>
              </tr>
            </Thead>
            <Tbody>
              {tenants.length === 0 ? <EmptyState /> : tenants.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{t.slug}</p>
                    </div>
                  </Td>
                  <Td>{t._count?.employees ?? 0} / {t.maxEmployees}</Td>
                  <Td><Badge status={t.status} /></Td>
                  <Td>{formatDate(t.subscriptionExpiresAt)}</Td>
                  <Td>
                    <Button
                      variant={t.status === 'active' ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => toggleMut.mutate({ id: t.id, status: t.status })}
                    >
                      <Power size={14} />
                      {t.status === 'active' ? 'تعليق' : 'تفعيل'}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة شركة جديدة" size="lg">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d as any))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم الشركة" error={errors.name?.message} {...register('name')} />
            <Input label="الـ Slug" placeholder="my-company" error={errors.slug?.message} {...register('slug')} />
            <Input label="الحد الأقصى للموظفين" type="number" error={errors.maxEmployees?.message} {...register('maxEmployees')} />
            <Input label="انتهاء الاشتراك" type="date" error={errors.subscriptionExpiresAt?.message} {...register('subscriptionExpiresAt')} />
          </div>
          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">بيانات مسؤول HR الأول</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" error={errors.adminFullName?.message} {...register('adminFullName')} />
            <Input label="البريد الإلكتروني" type="email" error={errors.adminEmail?.message} {...register('adminEmail')} />
            <Input label="كلمة المرور" type="password" error={errors.adminPassword?.message} {...register('adminPassword')} />
          </div>
          {createMut.error && (
            <p className="text-sm text-red-600">{(createMut.error as any)?.response?.data?.message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>إنشاء</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';
import type { Employee, Department } from '@/types';

const schema = z.object({
  fullName: z.string().min(2),
  employeeCode: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
  hireDate: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['employee', 'manager', 'hr_admin']),
});
type FormData = z.infer<typeof schema>;

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => api.get('/employees', { params: { page, limit: 20, search } }).then((r) => r.data),
  });
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data),
  });

  const employees: Employee[] = data?.data ?? [];
  const departments: Department[] = deptData ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'employee' },
  });

  const createMut = useMutation({
    mutationFn: (body: FormData) => api.post('/employees', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setOpen(false); reset(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">إدارة الموظفين</h2>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> موظف جديد</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="بحث بالاسم أو الكود…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pr-9" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>الموظف</Th>
                <Th>الكود</Th>
                <Th>المسمى الوظيفي</Th>
                <Th>القسم</Th>
                <Th>تاريخ التعيين</Th>
                <Th>الحالة</Th>
              </tr>
            </Thead>
            <Tbody>
              {employees.length === 0 ? <EmptyState /> : employees.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {e.profilePhotoUrl ? (
                        <img src={e.profilePhotoUrl} alt={e.fullName} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {getInitials(e.fullName)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{e.fullName}</span>
                    </div>
                  </Td>
                  <Td><span className="font-mono text-xs">{e.employeeCode}</span></Td>
                  <Td>{e.jobTitle ?? '—'}</Td>
                  <Td>{e.department?.name ?? '—'}</Td>
                  <Td>{formatDate(e.hireDate)}</Td>
                  <Td><Badge status={e.status} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">إجمالي {data.total} موظف</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة موظف جديد" size="lg">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" error={errors.fullName?.message} {...register('fullName')} />
            <Input label="كود الموظف" error={errors.employeeCode?.message} {...register('employeeCode')} />
            <Input label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="رقم الجوال" error={errors.phone?.message} {...register('phone')} />
            <Input label="المسمى الوظيفي" error={errors.jobTitle?.message} {...register('jobTitle')} />
            <Select
              label="القسم"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="اختر قسم"
              error={errors.departmentId?.message}
              {...register('departmentId')}
            />
            <Input label="تاريخ التعيين" type="date" error={errors.hireDate?.message} {...register('hireDate')} />
            <Select
              label="الدور"
              options={[
                { value: 'employee', label: 'موظف' },
                { value: 'manager', label: 'مدير' },
                { value: 'hr_admin', label: 'HR Admin' },
              ]}
              error={errors.role?.message}
              {...register('role')}
            />
            <Input label="كلمة المرور" type="password" error={errors.password?.message} {...register('password')} className="col-span-2" />
          </div>
          {createMut.error && (
            <p className="text-sm text-red-600">{(createMut.error as any)?.response?.data?.message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

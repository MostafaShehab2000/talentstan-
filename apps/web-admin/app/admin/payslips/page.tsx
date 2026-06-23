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
import { formatCurrency } from '@/lib/utils';
import { Upload } from 'lucide-react';
import type { Payslip } from '@/types';

const schema = z.object({
  employeeId: z.string().uuid('ادخل UUID صحيح'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  basicSalary: z.coerce.number().positive(),
  netSalary: z.coerce.number().positive(),
  pdfUrl: z.string().url().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function PayslipsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['payslips', year],
    queryFn: () => api.get('/payslips/all', { params: { year } }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/payslips', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payslips'] }); setOpen(false); reset(); },
  });

  const payslips: Payslip[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">كشوف الرواتب</h2>
        <Button onClick={() => setOpen(true)}><Upload size={16} /> رفع كشف راتب</Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          type="number" value={year} onChange={(e) => setYear(+e.target.value)}
          className="w-28" placeholder="السنة"
        />
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
                <Th>الشهر</Th>
                <Th>الراتب الأساسي</Th>
                <Th>الصافي</Th>
                <Th>PDF</Th>
              </tr>
            </Thead>
            <Tbody>
              {payslips.length === 0 ? <EmptyState /> : payslips.map((p) => (
                <Tr key={p.id}>
                  <Td><span className="font-medium">{p.employee?.fullName ?? '—'}</span></Td>
                  <Td><span className="font-mono text-xs">{p.employee?.employeeCode}</span></Td>
                  <Td>{p.month}/{p.year}</Td>
                  <Td>{formatCurrency(p.basicSalary)}</Td>
                  <Td><span className="font-semibold text-emerald-700">{formatCurrency(p.netSalary)}</span></Td>
                  <Td>
                    {p.pdfUrl ? (
                      <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">تحميل</a>
                    ) : '—'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="رفع كشف راتب">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d as any))} className="space-y-4">
          <Input label="معرّف الموظف (ID)" placeholder="UUID" error={errors.employeeId?.message} {...register('employeeId')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الشهر" type="number" min={1} max={12} error={errors.month?.message} {...register('month')} />
            <Input label="السنة" type="number" error={errors.year?.message} {...register('year')} />
            <Input label="الراتب الأساسي" type="number" error={errors.basicSalary?.message} {...register('basicSalary')} />
            <Input label="الراتب الصافي" type="number" error={errors.netSalary?.message} {...register('netSalary')} />
          </div>
          <Input label="رابط PDF (اختياري)" type="url" error={errors.pdfUrl?.message} {...register('pdfUrl')} />
          {createMut.error && (
            <p className="text-sm text-red-600">{(createMut.error as any)?.response?.data?.message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>رفع</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

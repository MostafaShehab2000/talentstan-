'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import type { AppraisalCycle } from '@/types';

export default function AppraisalPage() {
  const [bellCycleId, setBellCycleId] = useState<string | null>(null);

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['appraisal-cycles'],
    queryFn: () => api.get('/appraisal/cycles').then((r) => r.data),
  });

  const { data: appraisals } = useQuery({
    queryKey: ['appraisals-all'],
    queryFn: () => api.get('/appraisal/all').then((r) => r.data),
  });

  const { data: bellData } = useQuery({
    queryKey: ['bell-curve', bellCycleId],
    queryFn: () => bellCycleId ? api.get(`/appraisal/cycles/${bellCycleId}/bell-curve`).then((r) => r.data) : null,
    enabled: !!bellCycleId,
  });

  const employees: any[] = appraisals?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">التقييم الوظيفي</h2>

      {/* Cycles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-gray-400">جارٍ التحميل…</p>
        ) : (cycles as AppraisalCycle[]).map((c) => (
          <Card key={c.id}>
            <CardBody className="space-y-3">
              <CardTitle>{c.name}</CardTitle>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <Badge status={c.status} />
                <span>{c._count?.appraisals ?? 0} تقييم</span>
              </div>
              {c.startDate && <p className="text-xs text-gray-400">{formatDate(c.startDate)} — {formatDate(c.endDate)}</p>}
              <Button variant="outline" size="sm" onClick={() => setBellCycleId(c.id)}>
                <BarChart3 size={14} /> Bell Curve
              </Button>
            </CardBody>
          </Card>
        ))}
        {cycles.length === 0 && !isLoading && <p className="text-sm text-gray-400 col-span-3 py-8 text-center">لا توجد دورات تقييم</p>}
      </div>

      {/* All appraisals table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">كل التقييمات</h3>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>الموظف</Th>
              <Th>الدورة</Th>
              <Th>الحالة</Th>
              <Th>التقييم الذاتي</Th>
              <Th>تقييم المدير</Th>
              <Th>النهائي</Th>
            </tr>
          </Thead>
          <Tbody>
            {employees.length === 0 ? <EmptyState /> : employees.map((a: any) => (
              <Tr key={a.id}>
                <Td><span className="font-medium">{a.employee?.fullName ?? '—'}</span></Td>
                <Td>{a.cycle?.name ?? '—'}</Td>
                <Td><Badge status={a.status} /></Td>
                <Td>{a.selfScore != null ? (+a.selfScore).toFixed(1) : '—'}</Td>
                <Td>{a.managerScore != null ? (+a.managerScore).toFixed(1) : '—'}</Td>
                <Td>{a.finalScore != null ? <span className="font-bold text-blue-700">{(+a.finalScore).toFixed(1)}</span> : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {/* Bell Curve modal */}
      <Modal open={!!bellCycleId} onClose={() => setBellCycleId(null)} title="Bell Curve — توزيع التقييمات" size="lg">
        {bellData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xl font-bold text-blue-700">{bellData.avg?.toFixed(1)}</p>
                <p className="text-gray-500">المتوسط</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xl font-bold text-purple-700">{bellData.stdDev?.toFixed(1)}</p>
                <p className="text-gray-500">الانحراف المعياري</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xl font-bold text-green-700">{bellData.employees?.length ?? 0}</p>
                <p className="text-gray-500">موظف</p>
              </div>
            </div>
            <div className="space-y-2">
              {bellData.distribution?.map((d: any) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-600">{d.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: `${Math.round((d.count / (bellData.employees?.length || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm font-medium text-gray-700">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

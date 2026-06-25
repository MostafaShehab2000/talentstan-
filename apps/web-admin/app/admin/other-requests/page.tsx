'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  permission:          'إذن',
  mission:             'مأمورية',
  hr_letter:           'خطاب HR',
  experience_letter:   'خطاب خبرة',
  salary_certificate:  'شهادة راتب',
  bank_letter:         'خطاب بنكي',
  mobile_line:         'خط موبايل',
  other:               'أخرى',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'معلق',       color: 'bg-yellow-100 text-yellow-800' },
  approved:  { label: 'موافق',      color: 'bg-green-100 text-green-800'  },
  rejected:  { label: 'مرفوض',      color: 'bg-red-100 text-red-800'      },
  cancelled: { label: 'ملغي',       color: 'bg-gray-100 text-gray-600'    },
};

type OtherRequest = {
  id: string;
  type: string;
  status: string;
  details?: string;
  createdAt: string;
  employee?: { fullName: string; employeeCode: string; department?: { name: string } };
};

export default function OtherRequestsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [note, setNote]                 = useState('');

  const { data: requests = [], isLoading } = useQuery<OtherRequest[]>({
    queryKey: ['other-requests', typeFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (typeFilter)   params.type   = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/other-requests/all', { params });
      return Array.isArray(data) ? data : (data.data ?? []);
    },
  });

  const processMutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      api.patch(`/other-requests/${id}/process`, { status, adminNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['other-requests'] }),
  });

  const pending   = requests.filter(r => r.status === 'submitted').length;
  const approved  = requests.filter(r => r.status === 'approved').length;
  const rejected  = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الطلبات الخاصة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة طلبات الإذن والمأمورية والخطابات الرسمية</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'معلق',  value: pending,  color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'موافق', value: approved, color: 'bg-green-50 border-green-200 text-green-700'   },
          { label: 'مرفوض', value: rejected, color: 'bg-red-50 border-red-200 text-red-700'         },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="submitted">معلق</option>
            <option value="approved">موافق</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>الموظف</Th>
              <Th>نوع الطلب</Th>
              <Th>التفاصيل</Th>
              <Th>تاريخ التقديم</Th>
              <Th>الحالة</Th>
              <Th>إجراء</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr><Td colSpan={6} className="text-center py-8 text-gray-400">جاري التحميل...</Td></Tr>
            ) : requests.length === 0 ? (
              <Tr><Td colSpan={6}><EmptyState message="لا توجد طلبات" /></Td></Tr>
            ) : requests.map(r => {
              const statusInfo = STATUS_LABELS[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <Tr key={r.id}>
                  <Td>
                    <div className="font-medium text-gray-900">{r.employee?.fullName ?? '—'}</div>
                    <div className="text-xs text-gray-400">{r.employee?.department?.name ?? r.employee?.employeeCode}</div>
                  </Td>
                  <Td>
                    <span className="font-medium text-blue-700">{TYPE_LABELS[r.type] ?? r.type}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-gray-600 line-clamp-1">{r.details ?? '—'}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-gray-500">{r.createdAt?.substring(0, 10)}</span>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </Td>
                  <Td>
                    {r.status === 'submitted' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:bg-green-50 hover:text-green-700"
                          disabled={processMutation.isPending}
                          onClick={() => processMutation.mutate({ id: r.id, status: 'approved' })}
                        >
                          <CheckCircle size={16} className="mr-1" /> موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={processMutation.isPending}
                          onClick={() => processMutation.mutate({ id: r.id, status: 'rejected' })}
                        >
                          <XCircle size={16} className="mr-1" /> رفض
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} /> تمت المعالجة
                      </span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}

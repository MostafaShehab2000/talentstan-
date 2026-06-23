'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/ui/card';
import { Building2, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import type { Tenant } from '@/types';

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/tenants').then((r) => r.data),
  });

  const tenants: Tenant[] = data?.data ?? [];
  const active = tenants.filter((t) => t.status === 'active').length;
  const expiringSoon = tenants.filter((t) => {
    if (!t.subscriptionExpiresAt) return false;
    const days = (new Date(t.subscriptionExpiresAt).getTime() - Date.now()) / 86400000;
    return days <= 30 && days >= 0;
  }).length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">لوحة تحكم Super Admin</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي الشركات" value={tenants.length} icon={<Building2 size={20} />} color="blue" />
        <StatCard title="نشطة" value={active} icon={<CheckCircle size={20} />} color="green" />
        <StatCard title="تنتهي قريباً" value={expiringSoon} icon={<AlertTriangle size={20} />} color="yellow" />
        <StatCard title="إجمالي الموظفين" value={tenants.reduce((s, t) => s + (t._count?.employees ?? 0), 0)} icon={<Users size={20} />} color="purple" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">الشركات المشتركة</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>الشركة</Th>
                <Th>الموظفون</Th>
                <Th>الحالة</Th>
                <Th>انتهاء الاشتراك</Th>
              </tr>
            </Thead>
            <Tbody>
              {tenants.length === 0 ? <EmptyState /> : tenants.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.slug}</p>
                    </div>
                  </Td>
                  <Td>{t._count?.employees ?? 0} / {t.maxEmployees}</Td>
                  <Td><Badge status={t.status} /></Td>
                  <Td>{formatDate(t.subscriptionExpiresAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

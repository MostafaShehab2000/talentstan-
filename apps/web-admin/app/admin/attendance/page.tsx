'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Fingerprint, RefreshCw, Wifi, WifiOff, Clock, Users } from 'lucide-react';

type Device = { id: string; name: string; ip: string; port: number; lastSync?: string; isActive: boolean };
type AttendanceRecord = {
  id: string; date: string; checkIn: string; checkOut?: string; workedMinutes?: number;
  employee?: { fullName: string; employeeCode: string; department?: { name: string } };
};

export default function AttendancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'sync' | 'records'>('sync');

  // Device form
  const [devName, setDevName]   = useState('مكينة الحضور 1');
  const [devIp, setDevIp]       = useState('');
  const [devPort, setDevPort]   = useState('4370');
  const [devPass, setDevPass]   = useState('0');
  const [syncMsg, setSyncMsg]   = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncing, setSyncing]   = useState(false);

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['biometric-devices'],
    queryFn: () => api.get('/attendance/devices').then(r => r.data),
  });

  const { data: today } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
  });

  const { data: records = [], isLoading: recLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-records'],
    queryFn: () => api.get('/attendance/all').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    enabled: tab === 'records',
  });

  const saveMut = useMutation({
    mutationFn: () => api.post('/attendance/devices', { name: devName, ip: devIp, port: +devPort, password: devPass }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biometric-devices'] }),
  });

  const handleSync = async (ip?: string) => {
    const syncIp = ip ?? devIp;
    if (!syncIp) { setSyncError('أدخل IP الجهاز أولاً'); return; }
    setSyncing(true); setSyncMsg(''); setSyncError('');
    try {
      const res = await api.post('/attendance/sync', { ip: syncIp, port: +devPort, password: devPass });
      setSyncMsg(`✅ تم سحب ${res.data.synced} سجل من أصل ${res.data.total} من الجهاز`);
      qc.invalidateQueries({ queryKey: ['attendance-records', 'attendance-today'] });
    } catch (e: any) {
      setSyncError(e.response?.data?.message ?? 'فشل الاتصال بالجهاز');
    } finally { setSyncing(false); }
  };

  const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-EG');
  const fmtHours = (m?: number) => m ? `${Math.floor(m / 60)}س ${m % 60}د` : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحضور والانصراف</h1>
          <p className="text-sm text-gray-500 mt-1">ربط مكينة البصمة وسحب بيانات الحضور تلقائياً</p>
        </div>
      </div>

      {/* Today Summary */}
      {today && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-700">{today.present}</div>
            <div className="text-sm text-green-600 mt-1">حاضر اليوم</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{today.absent}</div>
            <div className="text-sm text-red-600 mt-1">غائب</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{today.total}</div>
            <div className="text-sm text-blue-600 mt-1">إجمالي الموظفين</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['sync', 'records'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>
            {t === 'sync' ? '🖐️ مكينة البصمة' : '📋 سجل الحضور'}
          </button>
        ))}
      </div>

      {tab === 'sync' && (
        <div className="space-y-6">
          {/* Device Setup */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Fingerprint className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">إعداد جهاز البصمة</h2>
                <p className="text-xs text-gray-500">يدعم أجهزة ZKTeco وما يشابهها</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="اسم الجهاز" value={devName} onChange={e => setDevName(e.target.value)} placeholder="مكينة الحضور الرئيسية" />
              <Input label="عنوان IP" value={devIp} onChange={e => setDevIp(e.target.value)} placeholder="192.168.1.100" dir="ltr" />
              <Input label="المنفذ (Port)" value={devPort} onChange={e => setDevPort(e.target.value)} placeholder="4370" dir="ltr" />
              <Input label="كلمة المرور" value={devPass} onChange={e => setDevPass(e.target.value)} placeholder="0 (افتراضي)" dir="ltr" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => saveMut.mutate()} disabled={!devIp} variant="outline">
                حفظ الجهاز
              </Button>
              <Button onClick={() => handleSync()} disabled={syncing || !devIp} className="flex items-center gap-2">
                {syncing ? <><RefreshCw size={16} className="animate-spin" /> جارٍ السحب...</> : <><Fingerprint size={16} /> سحب بيانات الحضور</>}
              </Button>
            </div>

            {syncMsg && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{syncMsg}</div>}
            {syncError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {syncError}</div>}
          </div>

          {/* Saved Devices */}
          {devices.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-semibold text-gray-800">الأجهزة المحفوظة</div>
              <Table>
                <Thead><Tr><Th>الاسم</Th><Th>IP</Th><Th>Port</Th><Th>آخر مزامنة</Th><Th>سحب</Th></Tr></Thead>
                <Tbody>
                  {devices.map(d => (
                    <Tr key={d.id}>
                      <Td><div className="flex items-center gap-2"><Wifi size={14} className="text-green-500" />{d.name}</div></Td>
                      <Td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.ip}</code></Td>
                      <Td>{d.port}</Td>
                      <Td className="text-gray-500 text-xs">{d.lastSync ? new Date(d.lastSync).toLocaleString('ar-EG') : 'لم تتم مزامنة'}</Td>
                      <Td>
                        <button onClick={() => { setDevIp(d.ip); handleSync(d.ip); }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                          <RefreshCw size={13} /> سحب
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {recLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل...</div>
          ) : (
            <Table>
              <Thead>
                <Tr><Th>الموظف</Th><Th>القسم</Th><Th>التاريخ</Th><Th>الدخول</Th><Th>الخروج</Th><Th>ساعات العمل</Th></Tr>
              </Thead>
              <Tbody>
                {records.length === 0 ? (
                  <Tr><Td colSpan={6}><EmptyState message="لا توجد سجلات — اسحب البيانات من مكينة البصمة أولاً" /></Td></Tr>
                ) : records.map(r => (
                  <Tr key={r.id}>
                    <Td>
                      <div className="font-medium">{r.employee?.fullName}</div>
                      <div className="text-xs text-gray-400">{r.employee?.employeeCode}</div>
                    </Td>
                    <Td>{r.employee?.department?.name ?? '—'}</Td>
                    <Td>{fmtDate(r.date)}</Td>
                    <Td>
                      <span className="text-green-700 font-medium">{fmtTime(r.checkIn)}</span>
                    </Td>
                    <Td>
                      <span className="text-red-600 font-medium">{fmtTime(r.checkOut)}</span>
                    </Td>
                    <Td>
                      <span className={`font-medium ${r.workedMinutes && r.workedMinutes >= 480 ? 'text-green-600' : 'text-orange-500'}`}>
                        {fmtHours(r.workedMinutes)}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

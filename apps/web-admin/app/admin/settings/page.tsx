'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, Calendar, Clock, Settings2 } from 'lucide-react';

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'holidays' | 'workhours'>('holidays');
  const [openAdd, setOpenAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [recurring, setRecurring] = useState(false);

  // Work Hours local state
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [lateAfter, setLateAfter] = useState(15);
  const [whSaved, setWhSaved] = useState(false);

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => api.get('/settings/holidays').then(r => r.data),
  });

  const { data: workHours } = useQuery({
    queryKey: ['work-hours'],
    queryFn: () => api.get('/settings/work-hours').then(r => r.data),
    onSuccess: (d: any) => {
      if (d) {
        setWorkDays(d.workDays ?? [0, 1, 2, 3, 4]);
        setStartTime(d.startTime ?? '09:00');
        setEndTime(d.endTime ?? '17:00');
        setLateAfter(d.lateAfterMins ?? 15);
      }
    },
  } as any);

  const addHolidayMut = useMutation({
    mutationFn: () => api.post('/settings/holidays', { name: newName, date: newDate, isRecurring: recurring }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); setOpenAdd(false); setNewName(''); setNewDate(''); setRecurring(false); },
  });

  const deleteHolidayMut = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/holidays/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });

  const saveWorkHoursMut = useMutation({
    mutationFn: () => api.put('/settings/work-hours', { workDays, startTime, endTime, lateAfterMins: lateAfter }),
    onSuccess: () => { setWhSaved(true); setTimeout(() => setWhSaved(false), 3000); },
  });

  const toggleDay = (day: number) => {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  // Sort holidays by date
  const sortedHolidays = [...holidays].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingHolidays = sortedHolidays.filter((h: any) => new Date(h.date) >= new Date());
  const pastHolidays = sortedHolidays.filter((h: any) => new Date(h.date) < new Date());

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Settings2 size={22} className="text-gray-700" />
        <h2 className="text-xl font-bold text-gray-900">الإعدادات</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: 'holidays', label: 'الإجازات الرسمية', icon: <Calendar size={15} /> },
          { key: 'workhours', label: 'ساعات العمل', icon: <Clock size={15} /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Holidays Tab ── */}
      {tab === 'holidays' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{holidays.length} إجازة رسمية مضافة</p>
            <Button onClick={() => setOpenAdd(true)}>
              <Plus size={16} /> إضافة إجازة
            </Button>
          </div>

          {upcomingHolidays.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-emerald-50">
                <p className="text-xs font-semibold text-emerald-700">القادمة</p>
              </div>
              {upcomingHolidays.map((h: any) => (
                <HolidayRow key={h.id} holiday={h} onDelete={() => deleteHolidayMut.mutate(h.id)} />
              ))}
            </div>
          )}

          {pastHolidays.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-60">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500">السابقة</p>
              </div>
              {pastHolidays.map((h: any) => (
                <HolidayRow key={h.id} holiday={h} onDelete={() => deleteHolidayMut.mutate(h.id)} />
              ))}
            </div>
          )}

          {holidays.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              <Calendar size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">لا توجد إجازات رسمية بعد</p>
              <p className="text-xs mt-1">أضف إجازات رسمية كالأعياد وأيام العطل الرسمية</p>
            </div>
          )}
        </div>
      )}

      {/* ── Work Hours Tab ── */}
      {tab === 'workhours' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">

            {/* أيام العمل */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">أيام العمل</label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      workDays.includes(i)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">{workDays.length} أيام عمل في الأسبوع</p>
            </div>

            {/* وقت الدوام */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">وقت بدء الدوام</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">وقت انتهاء الدوام</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* دقائق التأخير */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">يُعتبر متأخراً بعد (دقيقة)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={60} value={lateAfter}
                  onChange={e => setLateAfter(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-sm font-bold text-blue-700 w-12 text-center">{lateAfter} د</span>
              </div>
            </div>

            {/* ملخص */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm text-blue-800">
                <strong>ملخص:</strong> العمل من <strong>{startTime}</strong> إلى <strong>{endTime}</strong>، أيام العمل: <strong>{workDays.map(d => DAY_LABELS[d]).join(' / ')}</strong>، التأخير يُحتسب بعد <strong>{lateAfter} دقيقة</strong>
              </p>
            </div>

            {whSaved && <p className="text-sm text-emerald-600 font-medium">✅ تم حفظ الإعدادات بنجاح</p>}

            <Button onClick={() => saveWorkHoursMut.mutate()} loading={saveWorkHoursMut.isPending}>
              حفظ الإعدادات
            </Button>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="إضافة إجازة رسمية">
        <div className="space-y-4">
          <Input label="اسم الإجازة" placeholder="مثال: عيد الأضحى المبارك" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input label="التاريخ" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700">إجازة سنوية متكررة</span>
          </label>
          {addHolidayMut.error && (
            <p className="text-sm text-red-600">{(addHolidayMut.error as any)?.response?.data?.message ?? 'حدث خطأ'}</p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setOpenAdd(false)}>إلغاء</Button>
            <Button onClick={() => addHolidayMut.mutate()} loading={addHolidayMut.isPending} disabled={!newName || !newDate}>
              إضافة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HolidayRow({ holiday, onDelete }: { holiday: any; onDelete: () => void }) {
  const date = new Date(holiday.date);
  const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 ${isToday ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-yellow-400' : 'bg-gray-100'}`}>
        <span className="text-xs font-bold text-gray-700">{date.getDate()}</span>
        <span className="text-[10px] text-gray-500">{date.toLocaleDateString('ar-EG', { month: 'short' })}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{holiday.name}</p>
        <p className="text-xs text-gray-400">{dayName} • {date.getFullYear()}{holiday.isRecurring ? ' • سنوية' : ''}</p>
      </div>
      {isToday && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">اليوم</span>}
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

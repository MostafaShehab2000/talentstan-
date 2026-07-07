'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { GitBranch, Users, UserCheck, User, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ApprovalChain = 'manager_then_hr' | 'hr_only' | 'specific_person';

interface OtherRequestConfig {
  type: string;
  approvalChain: ApprovalChain;
  approverCode?: string | null;
}

interface LeaveType {
  id: string;
  name: string;
  category: string;
  approvalChain: ApprovalChain;
  approverCode?: string | null;
}

const OTHER_TYPE_LABELS: Record<string, string> = {
  permission:         '🕐 إذن خروج',
  mission:            '🚗 مأمورية',
  advance:            '💰 سلفة',
  hr_letter:          '📄 خطاب HR',
  experience_letter:  '📋 خطاب خبرة',
  salary_certificate: '💵 شهادة راتب',
  bank_letter:        '🏦 خطاب بنكي',
  data_change:        '✏️ تعديل بيانات',
  mobile_line:        '📱 موبايل لاين',
  other:              '📎 طلب آخر',
};

const CHAIN_OPTIONS: { value: ApprovalChain; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'manager_then_hr', label: 'المدير ثم HR',  icon: <Users size={14} />,     desc: 'يعتمد المدير أولاً ثم قسم الموارد البشرية' },
  { value: 'hr_only',        label: 'HR فقط',         icon: <UserCheck size={14} />, desc: 'يذهب مباشرة لقسم الموارد البشرية' },
  { value: 'specific_person', label: 'شخص مسؤول',     icon: <User size={14} />,      desc: 'يذهب لموظف محدد بكوده الوظيفي' },
];

function ChainSelector({ value, onChange, approverCode, onCodeChange }: {
  value: ApprovalChain;
  onChange: (v: ApprovalChain) => void;
  approverCode?: string | null;
  onCodeChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {CHAIN_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              value === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
      {value === 'specific_person' && (
        <input
          className="w-full text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          placeholder="كود الموظف المسؤول (مثال: EMP-001)"
          value={approverCode ?? ''}
          onChange={e => onCodeChange(e.target.value)}
        />
      )}
    </div>
  );
}

function OtherRequestsSection() {
  const qc = useQueryClient();
  const { data: configs = [], isLoading } = useQuery<OtherRequestConfig[]>({
    queryKey: ['other-request-configs'],
    queryFn: () => api.get('/other-requests/configs').then(r => r.data?.data ?? r.data ?? []),
  });

  const [local, setLocal] = useState<Record<string, { chain: ApprovalChain; code: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getChain = (type: string): ApprovalChain =>
    local[type]?.chain ?? configs.find(c => c.type === type)?.approvalChain ?? 'manager_then_hr';
  const getCode = (type: string): string =>
    local[type]?.code ?? configs.find(c => c.type === type)?.approverCode ?? '';

  const save = async (type: string) => {
    setSaving(type);
    try {
      await api.post('/other-requests/configs', {
        type,
        approvalChain: getChain(type),
        approverCode: getChain(type) === 'specific_person' ? getCode(type) : null,
      });
      await qc.invalidateQueries({ queryKey: ['other-request-configs'] });
      setLocal(prev => { const n = { ...prev }; delete n[type]; return n; });
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <Skeleton />;

  return (
    <div className="space-y-3">
      {Object.entries(OTHER_TYPE_LABELS).map(([type, label]) => {
        const isDirty = !!local[type];
        return (
          <div key={type} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
                <ChainSelector
                  value={getChain(type)}
                  onChange={v => setLocal(prev => ({ ...prev, [type]: { chain: v, code: getCode(type) } }))}
                  approverCode={getCode(type)}
                  onCodeChange={c => setLocal(prev => ({ ...prev, [type]: { chain: getChain(type), code: c } }))}
                />
              </div>
              {isDirty && (
                <Button size="sm" loading={saving === type} onClick={() => save(type)} className="flex-shrink-0 mt-6">
                  <Save size={13} /> حفظ
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaveTypesSection() {
  const qc = useQueryClient();
  const { data: leaveTypes = [], isLoading } = useQuery<LeaveType[]>({
    queryKey: ['leave-types-config'],
    queryFn: () => api.get('/leave/types').then(r => r.data?.data ?? r.data ?? []),
  });

  const [local, setLocal] = useState<Record<string, { chain: ApprovalChain; code: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getChain = (lt: LeaveType): ApprovalChain =>
    local[lt.id]?.chain ?? lt.approvalChain ?? 'manager_then_hr';
  const getCode = (lt: LeaveType): string =>
    local[lt.id]?.code ?? lt.approverCode ?? '';

  const save = async (lt: LeaveType) => {
    setSaving(lt.id);
    try {
      await api.patch(`/leave/types/${lt.id}`, {
        approvalChain: getChain(lt),
        approverCode: getChain(lt) === 'specific_person' ? getCode(lt) : null,
      });
      await qc.invalidateQueries({ queryKey: ['leave-types-config'] });
      setLocal(prev => { const n = { ...prev }; delete n[lt.id]; return n; });
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <Skeleton />;
  if (leaveTypes.length === 0) return (
    <div className="text-center py-10 text-gray-400 text-sm">لا توجد أنواع إجازات — أضفها من صفحة الإجازات أولاً</div>
  );

  return (
    <div className="space-y-3">
      {leaveTypes.map(lt => {
        const isDirty = !!local[lt.id];
        return (
          <div key={lt.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-800">{lt.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lt.category}</span>
                </div>
                <ChainSelector
                  value={getChain(lt)}
                  onChange={v => setLocal(prev => ({ ...prev, [lt.id]: { chain: v, code: getCode(lt) } }))}
                  approverCode={getCode(lt)}
                  onCodeChange={c => setLocal(prev => ({ ...prev, [lt.id]: { chain: getChain(lt), code: c } }))}
                />
              </div>
              {isDirty && (
                <Button size="sm" loading={saving === lt.id} onClick={() => save(lt)} className="flex-shrink-0 mt-6">
                  <Save size={13} /> حفظ
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WorkflowPage() {
  const [tab, setTab] = useState<'other' | 'leave'>('other');

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <GitBranch size={22} className="text-gray-700" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">مسارات الموافقة</h2>
          <p className="text-xs text-gray-400 mt-0.5">حدد من يوافق على كل نوع طلب</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1.5">
        {CHAIN_OPTIONS.map(opt => (
          <div key={opt.value} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-blue-600">{opt.icon}</span>
            <span className="font-medium text-gray-800">{opt.label}:</span>
            <span>{opt.desc}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['other', 'leave'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'other' ? 'الطلبات الأخرى' : 'أنواع الإجازات'}
          </button>
        ))}
      </div>

      {tab === 'other' ? <OtherRequestsSection /> : <LeaveTypesSection />}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
      ))}
    </div>
  );
}

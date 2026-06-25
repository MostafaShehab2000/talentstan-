'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, Heart, MessageCircle, Pin, Megaphone, FileText, AlertCircle, Calendar } from 'lucide-react';

const POST_TYPES = [
  { value: 'normal', label: 'إشعار عام', icon: '📢' },
  { value: 'announcement', label: 'قرار إداري', icon: '📋' },
];
const SCOPE_LABELS: Record<string, string> = { company: 'الشركة كلها', department: 'إدارة محددة' };

type Dept = { id: string; name: string };

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('normal');
  const [targetScope, setTargetScope] = useState('company');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [apiError, setApiError] = useState('');

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/communication/feed').then(r => r.data),
  });
  const { data: deptRaw } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const depts: Dept[] = Array.isArray(deptRaw) ? deptRaw : (deptRaw as any)?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => api.post('/communication/posts', {
      content, postType, targetScope,
      targetDepartmentIds: targetScope === 'department' && targetDeptId ? [targetDeptId] : undefined,
      isPinned,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); setOpen(false); resetForm(); },
    onError: (err: any) => { const m = err.response?.data?.message; setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ')); },
  });

  const resetForm = () => { setContent(''); setPostType('normal'); setTargetScope('company'); setTargetDeptId(''); setAllowComments(true); setIsPinned(false); setApiError(''); };

  const posts: any[] = feed?.data ?? feed ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">التواصل الداخلي</h2>
        <Button onClick={() => { resetForm(); setOpen(true); }}><Plus size={16} /> منشور جديد</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {posts.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">لا توجد منشورات بعد</p>}
          {posts.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  {getInitials(p.author?.fullName ?? 'U')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{p.author?.fullName}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Pin size={10} /> مثبت</span>}
                  {p.postType === 'announcement' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">قرار إداري</span>}
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.content}</p>
              <div className="flex items-center gap-4 pt-1 text-xs text-gray-400 border-t border-gray-100">
                <span className="flex items-center gap-1"><Heart size={13} /> {p._count?.reactions ?? 0}</span>
                <span className="flex items-center gap-1"><MessageCircle size={13} /> {p._count?.comments ?? 0}</span>
                <span className="text-xs text-gray-300 mr-auto">{SCOPE_LABELS[p.targetScope] ?? p.targetScope}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="نشر إعلان جديد" size="lg">
        <div className="space-y-4">
          {/* Post type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">نوع المنشور</label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setPostType(t.value)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${postType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">الجمهور المستهدف</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={targetScope} onChange={e => setTargetScope(e.target.value)}>
                <option value="company">الشركة كلها</option>
                <option value="department">إدارة محددة</option>
              </select>
            </div>
            {targetScope === 'department' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">الإدارة</label>
                <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={targetDeptId} onChange={e => setTargetDeptId(e.target.value)}>
                  <option value="">اختر إدارة</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">المحتوى</label>
            <textarea rows={5} value={content} onChange={e => setContent(e.target.value)}
              placeholder="اكتب محتوى الإعلان…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
              تثبيت المنشور
            </label>
          </div>

          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!content.trim()}>نشر</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

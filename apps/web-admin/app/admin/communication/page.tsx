'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, Heart, MessageCircle, Pin, Trash2, MessageSquareOff, MessageSquare } from 'lucide-react';

const POST_TYPES = [
  { value: 'normal',       label: 'إشعار عام',    icon: '📢' },
  { value: 'announcement', label: 'قرار إداري',   icon: '📋' },
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
  const [isPinned, setIsPinned] = useState(false);
  const [apiError, setApiError] = useState('');

  // Reactions modal
  const [reactionsPostId, setReactionsPostId] = useState<string | null>(null);
  // Comments modal
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/communication/feed').then(r => r.data),
  });
  const { data: deptRaw } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });
  const depts: Dept[] = Array.isArray(deptRaw) ? deptRaw : (deptRaw as any)?.data ?? [];

  // Reactions data
  const { data: reactionsRaw, isLoading: reactLoading } = useQuery({
    queryKey: ['post-reactions', reactionsPostId],
    queryFn: () => api.get(`/communication/posts/${reactionsPostId}/reactions`).then(r => r.data),
    enabled: !!reactionsPostId,
  });
  const reactions: any[] = Array.isArray(reactionsRaw) ? reactionsRaw : [];

  // Comments data
  const { data: commentsRaw, isLoading: commentsLoading } = useQuery({
    queryKey: ['post-comments', commentsPostId],
    queryFn: () => api.get(`/communication/posts/${commentsPostId}/comments`).then(r => r.data),
    enabled: !!commentsPostId,
  });
  const comments: any[] = commentsRaw?.data ?? commentsRaw ?? [];

  const createMut = useMutation({
    mutationFn: () => api.post('/communication/posts', {
      content, postType, targetScope,
      targetDepartmentIds: targetScope === 'department' && targetDeptId ? [targetDeptId] : undefined,
      isPinned,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); setOpen(false); resetForm(); },
    onError: (err: any) => { const m = err.response?.data?.message; setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ')); },
  });

  const deletePostMut = useMutation({
    mutationFn: (id: string) => api.delete(`/communication/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const toggleCommentsMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/communication/posts/${id}/comments-enabled`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const deleteCommentMut = useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      api.delete(`/communication/posts/${postId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post-comments', commentsPostId] }),
  });

  const resetForm = () => { setContent(''); setPostType('normal'); setTargetScope('company'); setTargetDeptId(''); setIsPinned(false); setApiError(''); };
  const posts: any[] = feed?.data ?? feed ?? [];
  const commentsPost = posts.find((p: any) => p.id === commentsPostId);

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
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  {getInitials(p.author?.fullName ?? 'U')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{p.author?.fullName}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">📌 مثبت</span>}
                  {p.postType === 'announcement' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">قرار إداري</span>}
                  <button onClick={() => { if (confirm('حذف المنشور؟')) deletePostMut.mutate(p.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.content}</p>

              {/* Stats + Actions */}
              <div className="flex items-center gap-3 pt-1 border-t border-gray-100 flex-wrap">
                {/* Reactions */}
                <button onClick={() => setReactionsPostId(p.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                  <Heart size={14} />
                  <span>{p._count?.reactions ?? 0} إعجاب</span>
                </button>

                {/* Comments */}
                <button onClick={() => setCommentsPostId(p.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                  <MessageCircle size={14} />
                  <span>{p._count?.comments ?? 0} تعليق</span>
                </button>

                {/* Toggle comments */}
                <button
                  onClick={() => toggleCommentsMut.mutate({ id: p.id, enabled: !p.commentsEnabled })}
                  className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-0.5 rounded-full border ${p.commentsEnabled !== false ? 'text-green-700 border-green-200 bg-green-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'text-red-600 border-red-200 bg-red-50 hover:bg-green-50 hover:text-green-700 hover:border-green-200'}`}>
                  {p.commentsEnabled !== false ? <><MessageSquare size={11} /> التعليقات مفتوحة</> : <><MessageSquareOff size={11} /> التعليقات مغلقة</>}
                </button>

                <span className="text-xs text-gray-300 mr-auto">{SCOPE_LABELS[p.targetScope] ?? p.targetScope}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Post Modal ── */}
      <Modal open={open} onClose={() => setOpen(false)} title="نشر إعلان جديد" size="lg">
        <div className="space-y-4">
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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">المحتوى</label>
            <textarea rows={5} value={content} onChange={e => setContent(e.target.value)}
              placeholder="اكتب محتوى الإعلان…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
            تثبيت المنشور
          </label>
          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!content.trim()}>نشر</Button>
          </div>
        </div>
      </Modal>

      {/* ── Reactions Modal ── */}
      <Modal open={!!reactionsPostId} onClose={() => setReactionsPostId(null)} title="من أعجب بهذا المنشور">
        {reactLoading ? (
          <div className="py-8 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : reactions.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">لا توجد إعجابات بعد</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {reactions.map((r: any) => (
              <div key={r.employeeId} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {getInitials(r.employee?.fullName ?? 'U')}
                </div>
                <span className="text-sm text-gray-700">{r.employee?.fullName}</span>
                <span className="text-xs text-gray-400 mr-auto">❤️ {r.reactionType}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Comments Modal ── */}
      <Modal open={!!commentsPostId} onClose={() => setCommentsPostId(null)} title="تعليقات المنشور" size="lg">
        <div className="space-y-4">
          {/* Toggle comments button */}
          {commentsPost && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-2">
              <span className="text-sm text-gray-700">
                التعليقات: <strong>{commentsPost.commentsEnabled !== false ? 'مفتوحة ✅' : 'مغلقة ❌'}</strong>
              </span>
              <Button
                size="sm"
                variant={commentsPost.commentsEnabled !== false ? 'danger' : 'success'}
                onClick={() => toggleCommentsMut.mutate({ id: commentsPost.id, enabled: !commentsPost.commentsEnabled })}
                loading={toggleCommentsMut.isPending}>
                {commentsPost.commentsEnabled !== false ? 'إغلاق التعليقات' : 'فتح التعليقات'}
              </Button>
            </div>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">لا توجد تعليقات بعد</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                    {getInitials(c.employee?.fullName ?? 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{c.employee?.fullName}</p>
                    <p className="text-sm text-gray-800 mt-0.5 break-words">{c.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm('حذف التعليق؟')) deleteCommentMut.mutate({ postId: commentsPostId!, commentId: c.id }); }}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

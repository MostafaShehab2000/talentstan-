'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, Heart, MessageCircle, Eye } from 'lucide-react';

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/communication/feed').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/communication/posts', { content, postType: 'announcement', targetScope: 'company' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); setOpen(false); setContent(''); },
  });

  const posts = feed?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">التواصل الداخلي</h2>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> منشور جديد</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {posts.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">لا توجد منشورات</p>}
          {posts.map((p: any) => (
            <Card key={p.id}>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                    {getInitials(p.author?.fullName ?? 'U')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.author?.fullName}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt, { dateStyle: 'medium', timeStyle: 'short' as any })}</p>
                  </div>
                  {p.isPinned && <span className="mr-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">📌 مثبت</span>}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{p.content}</p>
                <div className="flex items-center gap-4 pt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Heart size={13} /> {p._count?.reactions ?? 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} /> {p._count?.comments ?? 0}</span>
                  <span className="flex items-center gap-1"><Eye size={13} /> {p._count?.views ?? 0}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="نشر إعلان">
        <div className="space-y-4">
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب محتوى الإعلان…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!content.trim()}>نشر</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

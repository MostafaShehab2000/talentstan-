'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Survey } from '@/types';

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  isAnonymous: z.boolean(),
  endsAt: z.string().optional(),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    questionType: z.enum(['mcq', 'rating', 'text', 'yes_no', 'likert']),
  })).min(1),
});
type FormData = z.infer<typeof schema>;

export default function SurveysPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [resultsId, setResultsId] = useState<string | null>(null);

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['surveys-all'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });

  const { data: results } = useQuery({
    queryKey: ['survey-results', resultsId],
    queryFn: () => resultsId ? api.get(`/surveys/${resultsId}/results`).then((r) => r.data) : null,
    enabled: !!resultsId,
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isAnonymous: true, questions: [{ questionText: '', questionType: 'rating' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const createMut = useMutation({
    mutationFn: (body: FormData) => api.post('/surveys', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys-all'] }); setOpen(false); reset(); },
  });

  const closeMut = useMutation({
    mutationFn: (id: string) => api.patch(`/surveys/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surveys-all'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">استطلاعات الرأي</h2>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> استطلاع جديد</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(surveys as Survey[]).map((s) => (
            <Card key={s.id}>
              <CardBody className="space-y-3">
                <CardTitle>{s.title}</CardTitle>
                {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{s._count?.questions ?? 0} سؤال</span>
                  <span>{s._count?.responses ?? 0} استجابة</span>
                </div>
                {s.endDate && <p className="text-xs text-gray-400">ينتهي: {formatDate(s.endDate)}</p>}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setResultsId(s.id)}>
                    <BarChart3 size={14} /> النتائج
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => closeMut.mutate(s.id)}>إغلاق</Button>
                </div>
              </CardBody>
            </Card>
          ))}
          {surveys.length === 0 && <p className="col-span-3 py-12 text-center text-gray-400 text-sm">لا توجد استطلاعات</p>}
        </div>
      )}

      {/* Create modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="إنشاء استطلاع" size="lg">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <Input label="عنوان الاستطلاع" error={errors.title?.message} {...register('title')} />
          <Input label="وصف (اختياري)" {...register('description')} />
          <Input label="تاريخ الانتهاء (اختياري)" type="datetime-local" {...register('endsAt')} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isAnonymous')} className="rounded" />
            استطلاع مجهول الهوية
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">الأسئلة</p>
            {fields.map((f, i) => (
              <div key={f.id} className="flex items-start gap-2">
                <Input placeholder={`سؤال ${i + 1}`} className="flex-1" {...register(`questions.${i}.questionText`)} />
                <select {...register(`questions.${i}.questionType`)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="rating">تقييم</option>
                  <option value="mcq">اختيار من متعدد</option>
                  <option value="yes_no">نعم / لا</option>
                  <option value="text">نص حر</option>
                  <option value="likert">ليكرت</option>
                </select>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="mt-2 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => append({ questionText: '', questionType: 'rating' })}>
              <Plus size={14} /> إضافة سؤال
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">إلغاء</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending}>إنشاء</Button>
          </div>
        </form>
      </Modal>

      {/* Results modal */}
      <Modal open={!!resultsId} onClose={() => setResultsId(null)} title="نتائج الاستطلاع" size="lg">
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-700">{results.totalResponses}</p>
                <p className="text-sm text-gray-500">استجابة</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">{results.totalParticipants}</p>
                <p className="text-sm text-gray-500">مشارك</p>
              </div>
            </div>
            {results.questions?.map((q: any) => (
              <div key={q.questionId} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800 mb-2">{q.questionText}</p>
                <p className="text-xs text-gray-500">{q.totalAnswers} إجابة</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

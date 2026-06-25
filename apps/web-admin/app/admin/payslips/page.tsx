'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';

type Payslip = {
  id: string; month: number; year: number;
  basicSalary: number; netSalary: number; pdfUrl?: string;
  employee?: { fullName: string; employeeCode: string };
};

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);
}

export default function PayslipsPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [apiError, setApiError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payslips', year, month],
    queryFn: () => api.get('/payslips/all', { params: { year, month: month || undefined, limit: 100 } }).then(r => r.data),
  });

  const bulkMut = useMutation({
    mutationFn: (payslips: any[]) => api.post('/payslips/bulk', { payslips }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payslips'] });
      setImportResult({ success: res.data?.created ?? res.data?.length ?? 0, errors: res.data?.errors ?? [] });
    },
    onError: (err: any) => {
      const m = err.response?.data?.message;
      setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ في الرفع'));
    },
  });

  const downloadTemplate = () => {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['employeeId', 'month', 'year', 'basicSalary', 'netSalary', 'pdfUrl'],
        ['UUID-الموظف', 6, 2026, 5000, 4500, ''],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'رواتب');
      XLSX.writeFile(wb, 'payslips_template.xlsx');
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setApiError('');
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const payslips = rows.map(r => ({
        employeeId: String(r.employeeId ?? r['معرف الموظف'] ?? ''),
        month: Number(r.month ?? r['الشهر']),
        year: Number(r.year ?? r['السنة'] ?? year),
        basicSalary: Number(r.basicSalary ?? r['الراتب الأساسي']),
        netSalary: Number(r.netSalary ?? r['الراتب الصافي']),
        ...(r.pdfUrl ? { pdfUrl: r.pdfUrl } : {}),
      })).filter(p => p.employeeId && p.month && p.basicSalary);
      if (payslips.length === 0) { setApiError('لم يتم العثور على بيانات صالحة في الملف'); setImporting(false); return; }
      bulkMut.mutate(payslips);
    } catch {
      setApiError('فشل قراءة الملف');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const payslips: Payslip[] = data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">كشوف الرواتب</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}><Download size={16} /> تنزيل النموذج</Button>
          <Button onClick={() => { setUploadOpen(true); setImportResult(null); setApiError(''); }}>
            <Upload size={16} /> رفع Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">السنة</label>
          <Input type="number" value={year} onChange={e => setYear(+e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">الشهر</label>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
            <option value={0}>كل الأشهر</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
          <Table>
            <Thead><tr>
              <Th>الموظف</Th><Th>الكود</Th><Th>الشهر</Th><Th>الراتب الأساسي</Th><Th>الصافي</Th><Th>PDF</Th>
            </tr></Thead>
            <Tbody>
              {payslips.length === 0 ? <EmptyState /> : payslips.map(p => (
                <Tr key={p.id}>
                  <Td><span className="font-medium">{p.employee?.fullName ?? '—'}</span></Td>
                  <Td><span className="font-mono text-xs">{p.employee?.employeeCode}</span></Td>
                  <Td>{MONTHS[(p.month ?? 1) - 1]} {p.year}</Td>
                  <Td>{formatCurrency(p.basicSalary)}</Td>
                  <Td><span className="font-semibold text-emerald-700">{formatCurrency(p.netSalary)}</span></Td>
                  <Td>{p.pdfUrl ? <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">تحميل</a> : '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="رفع كشوف الرواتب من Excel">
        <div className="space-y-4">
          {!importResult ? (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">تعليمات:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>نزّل النموذج باستخدام زر "تنزيل النموذج"</li>
                  <li>أضف بيانات الرواتب (employeeId هو UUID الموظف من النظام)</li>
                  <li>ارفع الملف هنا</li>
                </ol>
              </div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">اضغط لاختيار ملف Excel</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx أو .xls</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
              {(importing || bulkMut.isPending) && <p className="text-sm text-center text-blue-600">جارٍ الرفع…</p>}
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-green-700 font-medium">تم الرفع بنجاح</p>
                <p className="text-sm text-green-600">تم إضافة {importResult.success} كشف راتب</p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700 font-medium mb-1">أخطاء ({importResult.errors.length}):</p>
                  {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
              <Button className="w-full" onClick={() => setUploadOpen(false)}>إغلاق</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

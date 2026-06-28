'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Upload, Download, FileSpreadsheet, Eye } from 'lucide-react';

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function fmt(n: number | undefined | null) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);
}

type Payslip = {
  id: string; month: number; year: number;
  basicSalary: number; netSalary: number; pdfUrl?: string;
  allowances?: any; deductions?: any;
  employee?: { fullName: string; employeeCode: string };
};

export default function PayslipsPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailSlip, setDetailSlip] = useState<Payslip | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [apiError, setApiError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payslips', year, month],
    queryFn: () => api.get('/payslips/all', { params: { year, month: month || undefined, limit: 200 } }).then(r => r.data),
  });

  const bulkMut = useMutation({
    mutationFn: (payslips: any[]) => api.post('/payslips/bulk', { payslips }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payslips'] });
      setImportResult({ succeeded: res.data?.succeeded ?? 0, failed: res.data?.failed ?? 0 });
    },
    onError: (err: any) => {
      const m = err.response?.data?.message;
      setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'خطأ في الرفع'));
    },
  });

  // ─── تنزيل نموذج Excel الشامل ────────────────────────────────────────────
  const downloadTemplate = () => {
    import('xlsx').then(XLSX => {
      const headers = [
        'employeeId','month','year',
        'basicSalary','variableSalary','workingDays',
        'overtime','incentive','otherAllowances',
        'healthcareDeduction','advancesDeduction','otherDeductions',
        'netSalary','paymentMethod','pdfUrl',
      ];
      const example = [
        'UUID-الموظف', 6, 2026,
        5000, 500, 22,
        300, 1000, 0,
        150, 500, 0,
        6150, 'bank', '',
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, example]);
      // عرض الأعمدة
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'رواتب');
      XLSX.writeFile(wb, 'payslips_template.xlsx');
    });
  };

  // ─── قراءة ملف Excel ────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setApiError(''); setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      const payslips = rows.map(r => {
        const basic    = Number(r.basicSalary ?? r['الراتب الأساسي'] ?? 0);
        const variable = Number(r.variableSalary ?? r['المتغير'] ?? 0);
        const overtime = Number(r.overtime ?? r['الوقت الإضافي'] ?? 0);
        const incentive= Number(r.incentive ?? r['الحافز'] ?? 0);
        const otherAl  = Number(r.otherAllowances ?? r['بدلات أخرى'] ?? 0);
        const workDays = Number(r.workingDays ?? r['أيام العمل'] ?? 0);
        const health   = Number(r.healthcareDeduction ?? r['الرعاية الصحية'] ?? 0);
        const advances = Number(r.advancesDeduction ?? r['السلف'] ?? 0);
        const otherDed = Number(r.otherDeductions ?? r['خصومات أخرى'] ?? 0);
        const net      = Number(r.netSalary ?? r['الصافي'] ?? (basic + variable + overtime + incentive + otherAl - health - advances - otherDed));
        return {
          employeeId: String(r.employeeId ?? r['معرف الموظف'] ?? ''),
          month: Number(r.month ?? r['الشهر']),
          year:  Number(r.year  ?? r['السنة'] ?? year),
          basicSalary: basic,
          allowances: { variable, overtime, incentive, workingDays: workDays, other: otherAl },
          deductions: { healthcare: health, advances, other: otherDed },
          netSalary: net,
          paymentMethod: String(r.paymentMethod ?? r['طريقة الدفع'] ?? 'cash'),
          ...(r.pdfUrl ? { pdfUrl: r.pdfUrl } : {}),
        };
      }).filter(p => p.employeeId && p.month && p.basicSalary);

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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">السنة</label>
          <Input type="number" value={year} onChange={e => setYear(+e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">الشهر</label>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
            <option value={0}>كل الأشهر</option>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        {month > 0 && (
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
            إجمالي الرواتب الصافية: <strong>{fmt(payslips.reduce((s, p) => s + Number(p.netSalary), 0))}</strong>
            {' '} | عدد الموظفين: <strong>{payslips.length}</strong>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : (
          <Table>
            <Thead><tr>
              <Th>الموظف</Th>
              <Th>الشهر</Th>
              <Th>الأساسي</Th>
              <Th>المتغير</Th>
              <Th>الحافز</Th>
              <Th>الإضافي</Th>
              <Th>السلف</Th>
              <Th>الصافي</Th>
              <Th>الدفع</Th>
              <Th>تفاصيل</Th>
            </tr></Thead>
            <Tbody>
              {payslips.length === 0 ? <EmptyState /> : payslips.map(p => {
                const al  = p.allowances ?? {};
                const ded = p.deductions ?? {};
                const payMethod = al.paymentMethod ?? 'cash';
                return (
                  <Tr key={p.id}>
                    <Td>
                      <div>
                        <p className="font-medium text-gray-900">{p.employee?.fullName ?? '—'}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.employee?.employeeCode}</p>
                      </div>
                    </Td>
                    <Td>{MONTHS[(p.month ?? 1) - 1]} {p.year}</Td>
                    <Td>{fmt(p.basicSalary)}</Td>
                    <Td>{fmt(al.variable)}</Td>
                    <Td>{fmt(al.incentive)}</Td>
                    <Td>{fmt(al.overtime)}</Td>
                    <Td>{ded.advances ? <span className="text-red-600">({fmt(ded.advances)})</span> : '—'}</Td>
                    <Td><span className="font-semibold text-emerald-700">{fmt(p.netSalary)}</span></Td>
                    <Td>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payMethod === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {payMethod === 'bank' ? '🏦 بنك' : '💵 كاش'}
                      </span>
                    </Td>
                    <Td>
                      <button onClick={() => setDetailSlip(p)}
                        className="text-blue-600 hover:text-blue-800 transition-colors">
                        <Eye size={16} />
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailSlip && (
        <Modal open={!!detailSlip} onClose={() => setDetailSlip(null)}
          title={`كشف راتب — ${detailSlip.employee?.fullName} — ${MONTHS[(detailSlip.month ?? 1) - 1]} ${detailSlip.year}`}>
          <div className="space-y-4">
            {/* Earnings */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 border-b border-gray-200">المستحقات</div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['الراتب الأساسي', detailSlip.basicSalary],
                    ['المتغير', detailSlip.allowances?.variable],
                    ['الوقت الإضافي', detailSlip.allowances?.overtime],
                    ['الحافز', detailSlip.allowances?.incentive],
                    ['بدلات أخرى', detailSlip.allowances?.other],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <tr key={String(label)} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-600">{label}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(Number(val))}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50">
                    <td className="px-4 py-2 font-semibold text-green-800">إجمالي المستحقات</td>
                    <td className="px-4 py-2 text-right font-bold text-green-800">
                      {fmt(
                        Number(detailSlip.basicSalary) +
                        Number(detailSlip.allowances?.variable ?? 0) +
                        Number(detailSlip.allowances?.overtime ?? 0) +
                        Number(detailSlip.allowances?.incentive ?? 0) +
                        Number(detailSlip.allowances?.other ?? 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 border-b border-gray-200">الخصومات</div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['الرعاية الصحية', detailSlip.deductions?.healthcare],
                    ['السلف', detailSlip.deductions?.advances],
                    ['خصومات أخرى', detailSlip.deductions?.other],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <tr key={String(label)} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-600">{label}</td>
                      <td className="px-4 py-2 text-right font-medium text-red-700">({fmt(Number(val))})</td>
                    </tr>
                  ))}
                  {!detailSlip.deductions?.healthcare && !detailSlip.deductions?.advances && !detailSlip.deductions?.other && (
                    <tr><td colSpan={2} className="px-4 py-2 text-center text-gray-400 text-xs">لا توجد خصومات</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Net */}
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-5 py-3">
              <div>
                <p className="text-sm text-gray-600">أيام العمل: <strong>{detailSlip.allowances?.workingDays ?? '—'}</strong></p>
                <p className="text-sm text-gray-600 mt-1">
                  طريقة الصرف: <strong>
                    {detailSlip.allowances?.paymentMethod === 'bank' ? '🏦 بنك' : '💵 كاش'}
                  </strong>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">الصافي</p>
                <p className="text-2xl font-black text-emerald-700">{fmt(detailSlip.netSalary)}</p>
              </div>
            </div>

            {detailSlip.pdfUrl && (
              <a href={detailSlip.pdfUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                تحميل PDF
              </a>
            )}
          </div>
        </Modal>
      )}

      {/* ── Upload Modal ── */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="رفع كشوف الرواتب من Excel" size="lg">
        <div className="space-y-4">
          {!importResult ? (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">تعليمات:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>نزّل النموذج باستخدام زر "تنزيل النموذج"</li>
                  <li>أضف UUID الموظف من صفحة الموظفين في النظام</li>
                  <li>أدخل التفاصيل المالية في الأعمدة المخصصة</li>
                  <li>طريقة الدفع: اكتب <strong>bank</strong> أو <strong>cash</strong></li>
                  <li>الصافي: يُحسب تلقائياً إن تركته فارغاً</li>
                  <li>ارفع الملف هنا</li>
                </ol>
              </div>

              {/* Column guide */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">أعمدة الملف</div>
                <div className="grid grid-cols-3 gap-0 text-xs">
                  {[
                    ['employeeId', 'UUID الموظف'],
                    ['month / year', 'الشهر / السنة'],
                    ['basicSalary', 'الراتب الأساسي'],
                    ['variableSalary', 'المتغير'],
                    ['workingDays', 'أيام العمل'],
                    ['overtime', 'الوقت الإضافي'],
                    ['incentive', 'الحافز'],
                    ['otherAllowances', 'بدلات أخرى'],
                    ['healthcareDeduction', 'الرعاية الصحية'],
                    ['advancesDeduction', 'السلف'],
                    ['otherDeductions', 'خصومات أخرى'],
                    ['netSalary', 'الصافي'],
                    ['paymentMethod', 'bank / cash'],
                    ['pdfUrl', 'رابط PDF (اختياري)'],
                  ].map(([col, desc]) => (
                    <div key={col} className="border-b border-r border-gray-100 px-2 py-1.5">
                      <p className="font-mono text-gray-700 text-[10px]">{col}</p>
                      <p className="text-gray-400 text-[10px]">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <FileSpreadsheet size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">اضغط لاختيار ملف Excel</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx أو .xls</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />

              {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
              {(importing || bulkMut.isPending) && <p className="text-sm text-center text-blue-600 animate-pulse">جارٍ الرفع…</p>}
            </>
          ) : (
            <div className="space-y-3 text-center py-4">
              <div className="text-5xl">✅</div>
              <p className="text-lg font-bold text-gray-900">تم رفع الرواتب</p>
              <p className="text-sm text-green-700">تم حفظ <strong>{importResult.succeeded}</strong> كشف راتب</p>
              {importResult.failed > 0 && <p className="text-sm text-red-600">فشل <strong>{importResult.failed}</strong> سجل (تحقق من UUID الموظف والبيانات)</p>}
              <Button className="mt-2" onClick={() => setUploadOpen(false)}>إغلاق</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

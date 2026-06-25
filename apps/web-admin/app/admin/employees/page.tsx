'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, Search, Pencil, Upload, Download, CheckCircle, XCircle } from 'lucide-react';

type Dept = { id: string; name: string };
type JobTitle = { id: string; title: string };
type Employee = {
  id: string; fullName: string; employeeCode: string; email?: string; phone?: string;
  status: string; hireDate?: string;
  department?: { name: string }; jobTitle?: { title: string };
};
type FormData = {
  fullName: string; employeeCode: string; email?: string; phone?: string;
  password?: string; departmentId?: string; jobTitleId?: string;
  directManagerId?: string; hireDate?: string;
  roles: string; isManager: boolean;
};

const ROLE_OPTIONS = [
  { value: 'employee', label: 'موظف' },
  { value: 'manager', label: 'مدير' },
  { value: 'hr_admin', label: 'HR Admin' },
];

// Excel columns mapping (Arabic labels → field names)
const EXCEL_COLUMNS = [
  { header: 'كود الموظف *', field: 'employeeCode' },
  { header: 'الاسم الكامل *', field: 'fullName' },
  { header: 'كلمة المرور *', field: 'password' },
  { header: 'البريد الإلكتروني', field: 'email' },
  { header: 'رقم الجوال', field: 'phone' },
  { header: 'تاريخ التعيين (YYYY-MM-DD)', field: 'hireDate' },
  { header: 'اسم القسم', field: 'departmentName' },
  { header: 'المسمى الوظيفي', field: 'jobTitleName' },
  { header: 'كود المدير المباشر', field: 'managerCode' },
  { header: 'الدور (employee/manager/hr_admin)', field: 'roles' },
];

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [apiError, setApiError] = useState('');
  const [importResult, setImportResult] = useState<{ success: string[]; failed: any[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => api.get('/employees', { params: { page, limit: 20, search: search || undefined } }).then(r => r.data),
  });
  const { data: deptRaw } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: jtRaw } = useQuery({ queryKey: ['job-titles'], queryFn: () => api.get('/job-titles').then(r => r.data) });
  const { data: empRaw } = useQuery({ queryKey: ['employees-all'], queryFn: () => api.get('/employees', { params: { limit: 500 } }).then(r => r.data) });

  const depts: Dept[] = Array.isArray(deptRaw) ? deptRaw : (deptRaw as any)?.data ?? [];
  const jobTitles: JobTitle[] = Array.isArray(jtRaw) ? jtRaw : (jtRaw as any)?.data ?? [];
  const allEmps: Employee[] = empRaw?.data ?? [];
  const employees: Employee[] = data?.data ?? [];

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { roles: 'employee', isManager: false },
  });

  const saveMut = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: any }) =>
      id ? api.patch(`/employees/${id}`, body) : api.post('/employees', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-all'] });
      setOpen(false); reset();
    },
    onError: (err: any) => {
      const m = err.response?.data?.message;
      setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'حدث خطأ'));
    },
  });

  const openCreate = () => { setEditing(null); reset({ roles: 'employee', isManager: false }); setApiError(''); setOpen(true); };
  const openEdit = (e: Employee) => {
    setEditing(e);
    reset({ fullName: e.fullName, employeeCode: e.employeeCode, email: e.email, phone: e.phone, roles: 'employee', isManager: false });
    setApiError(''); setOpen(true);
  };

  const onSubmit = (d: FormData) => {
    const body: any = {
      fullName: d.fullName, employeeCode: d.employeeCode,
      roles: [d.roles],
      isManager: d.roles === 'manager' || d.isManager,
    };
    if (d.email) body.email = d.email;
    if (d.phone) body.phone = d.phone;
    if (d.departmentId) body.departmentId = d.departmentId;
    if (d.jobTitleId) body.jobTitleId = d.jobTitleId;
    if (d.directManagerId) body.directManagerId = d.directManagerId;
    if (d.hireDate) body.hireDate = d.hireDate;
    if (!editing && d.password) body.password = d.password;
    saveMut.mutate({ id: editing?.id, body });
  };

  // ── Excel template download ──
  const downloadTemplate = async () => {
    const xlsx = await import('xlsx');
    const wb = xlsx.utils.book_new();

    // Main sheet
    const headers = EXCEL_COLUMNS.map(c => c.header);
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    xlsx.utils.book_append_sheet(wb, ws, 'الموظفون');

    // Departments reference sheet
    const deptData = [['اسم القسم', 'المعرّف (ID)'], ...depts.map(d => [d.name, d.id])];
    const wsDept = xlsx.utils.aoa_to_sheet(deptData);
    wsDept['!cols'] = [{ wch: 30 }, { wch: 40 }];
    xlsx.utils.book_append_sheet(wb, wsDept, 'الأقسام (مرجع)');

    // Job titles reference sheet
    const jtData = [['المسمى الوظيفي', 'المعرّف (ID)'], ...jobTitles.map(j => [j.title, j.id])];
    const wsJt = xlsx.utils.aoa_to_sheet(jtData);
    wsJt['!cols'] = [{ wch: 30 }, { wch: 40 }];
    xlsx.utils.book_append_sheet(wb, wsJt, 'المسميات (مرجع)');

    xlsx.writeFile(wb, 'نموذج_استيراد_الموظفين.xlsx');
  };

  // ── Excel upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const xlsx = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = xlsx.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) { alert('الملف فارغ أو لا يحتوي على بيانات'); setImporting(false); return; }

      // Map column header → field
      const headerRow = rows[0] as string[];
      const fieldMap: Record<string, number> = {};
      EXCEL_COLUMNS.forEach(col => {
        const idx = headerRow.findIndex(h => String(h).includes(col.field) || String(h) === col.header);
        if (idx >= 0) fieldMap[col.field] = idx;
      });
      // Fallback: use column order
      EXCEL_COLUMNS.forEach((col, i) => { if (fieldMap[col.field] === undefined) fieldMap[col.field] = i; });

      const getCell = (row: any[], field: string) => String(row[fieldMap[field]] ?? '').trim();

      const employeesToImport = rows.slice(1).filter(row => row.some(c => c !== '')).map(row => {
        const deptName = getCell(row, 'departmentName');
        const jtName = getCell(row, 'jobTitleName');
        const managerCode = getCell(row, 'managerCode');

        const dept = depts.find(d => d.name === deptName);
        const jt = jobTitles.find(j => j.title === jtName);
        const manager = allEmps.find(e => e.employeeCode === managerCode);
        const role = getCell(row, 'roles') || 'employee';

        return {
          employeeCode: getCell(row, 'employeeCode'),
          fullName: getCell(row, 'fullName'),
          password: getCell(row, 'password') || 'TempPass@123',
          email: getCell(row, 'email') || undefined,
          phone: getCell(row, 'phone') || undefined,
          hireDate: getCell(row, 'hireDate') || undefined,
          departmentId: dept?.id || undefined,
          jobTitleId: jt?.id || undefined,
          directManagerId: manager?.id || undefined,
          roles: [role],
          isManager: role === 'manager',
        };
      }).filter(e => e.employeeCode && e.fullName);

      if (employeesToImport.length === 0) { alert('لم يتم العثور على بيانات صالحة'); setImporting(false); return; }

      const { data: result } = await api.post('/employees/bulk', { employees: employeesToImport });
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-all'] });
    } catch (err: any) {
      alert('خطأ في قراءة الملف: ' + (err.response?.data?.message ?? err.message));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">إدارة الموظفين</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate} size="sm">
            <Download size={15} /> تحميل النموذج
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} size="sm" loading={importing}>
            <Upload size={15} /> استيراد Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          <Button onClick={openCreate}><Plus size={16} /> موظف جديد</Button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">نتيجة الاستيراد</h3>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 text-sm">إخفاء</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
              <CheckCircle size={18} className="text-green-600" />
              <div>
                <p className="text-xl font-bold text-green-700">{importResult.success.length}</p>
                <p className="text-xs text-green-600">تم الاستيراد بنجاح</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
              <XCircle size={18} className="text-red-500" />
              <div>
                <p className="text-xl font-bold text-red-600">{importResult.failed.length}</p>
                <p className="text-xs text-red-500">فشل الاستيراد</p>
              </div>
            </div>
          </div>
          {importResult.failed.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 space-y-1 max-h-32 overflow-y-auto">
              {importResult.failed.map((f: any, i: number) => (
                <p key={i} className="text-xs text-red-700">صف {f.row} — كود: {f.code} — {f.reason}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="بحث بالاسم أو الكود…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} className="pr-9" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
          <Table>
            <Thead><tr>
              <Th>الموظف</Th><Th>الكود</Th><Th>المسمى الوظيفي</Th><Th>القسم</Th><Th>تاريخ التعيين</Th><Th>الحالة</Th><Th>إجراءات</Th>
            </tr></Thead>
            <Tbody>
              {employees.length === 0 ? <EmptyState /> : employees.map(e => (
                <Tr key={e.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {getInitials(e.fullName)}
                      </div>
                      <span className="font-medium text-gray-900">{e.fullName}</span>
                    </div>
                  </Td>
                  <Td><span className="font-mono text-xs">{e.employeeCode}</span></Td>
                  <Td>{e.jobTitle?.title ?? '—'}</Td>
                  <Td>{e.department?.name ?? '—'}</Td>
                  <Td>{formatDate(e.hireDate)}</Td>
                  <Td><Badge status={e.status} /></Td>
                  <Td><Button size="sm" variant="outline" onClick={() => openEdit(e)}><Pencil size={13} /> تعديل</Button></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">إجمالي {data.total} موظف</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل موظف' : 'إضافة موظف جديد'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" {...register('fullName', { required: true })} />
            <Input label="كود الموظف" {...register('employeeCode', { required: true })} />
            <Input label="البريد الإلكتروني" type="email" {...register('email')} />
            <Input label="رقم الجوال" {...register('phone')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">القسم</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('departmentId')}>
                <option value="">— بدون قسم —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">المسمى الوظيفي</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('jobTitleId')}>
                <option value="">— بدون مسمى —</option>
                {jobTitles.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">المدير المباشر</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('directManagerId')}>
                <option value="">— بدون مدير —</option>
                {allEmps.filter(e => e.id !== editing?.id).map(e => (
                  <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">الدور</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('roles')}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <Input label="تاريخ التعيين" type="date" {...register('hireDate')} />
            {!editing && (
              <Input label="كلمة المرور" type="password" className="col-span-2" {...register('password', { required: !editing })} />
            )}
          </div>
          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={isSubmitting || saveMut.isPending}>{editing ? 'تحديث' : 'حفظ'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

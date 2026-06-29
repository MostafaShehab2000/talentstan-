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
import { Plus, Search, Pencil, Upload, Download, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';

type Dept = { id: string; name: string; parentDepartmentId?: string | null; children?: Dept[] };
type JobTitle = { id: string; title: string };
type Employee = {
  id: string; fullName: string; employeeCode: string; email?: string; phone?: string;
  status: string; hireDate?: string; isManager?: boolean;
  department?: { id: string; name: string };
  jobTitle?: { id: string; title: string };
  directManager?: { id: string; fullName: string };
  roles?: { role: string }[];
};
type FormData = {
  fullName: string; employeeCode: string; email?: string; phone?: string;
  password?: string; departmentId?: string; jobTitleId?: string;
  directManagerId?: string; hireDate?: string;
  role: string; isManager: boolean;
};

const ROLE_OPTIONS = [
  { value: 'employee',  label: 'موظف' },
  { value: 'manager',   label: 'مدير' },
  { value: 'hr_admin',  label: 'HR Admin' },
];

const EXCEL_COLUMNS = [
  { header: 'كود الموظف *',                      field: 'employeeCode' },
  { header: 'الاسم الكامل *',                    field: 'fullName' },
  { header: 'كلمة المرور *',                     field: 'password' },
  { header: 'البريد الإلكتروني',                 field: 'email' },
  { header: 'رقم الجوال',                        field: 'phone' },
  { header: 'تاريخ التعيين (YYYY-MM-DD)',         field: 'hireDate' },
  { header: 'اسم القسم',                         field: 'departmentName' },
  { header: 'المسمى الوظيفي',                    field: 'jobTitleName' },
  { header: 'كود المدير المباشر',                field: 'managerCode' },
  { header: 'الدور (employee/manager/hr_admin)', field: 'role' },
];

// Flatten tree to get all departments (top + children)
function flattenDepts(depts: Dept[]): Dept[] {
  return depts.flatMap(d => [d, ...flattenDepts(d.children ?? [])]);
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [apiError, setApiError] = useState('');
  const [importResult, setImportResult] = useState<{ success: string[]; failed: any[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // UI state for cascading dept (parent = إدارة, child = القسم actual departmentId)
  const [parentDeptId, setParentDeptId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search, statusFilter],
    queryFn: () => api.get('/employees', { params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined } }).then(r => r.data),
  });
  const { data: deptRaw } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: jtRaw }   = useQuery({ queryKey: ['job-titles'],   queryFn: () => api.get('/job-titles').then(r => r.data) });
  const { data: empRaw }  = useQuery({ queryKey: ['employees-all'], queryFn: () => api.get('/employees', { params: { limit: 500 } }).then(r => r.data) });

  const treeDepts: Dept[]    = Array.isArray(deptRaw) ? deptRaw : (deptRaw as any)?.data ?? [];
  const allDepts: Dept[]     = flattenDepts(treeDepts); // كل الأقسام مسطحة
  const topDepts: Dept[]     = treeDepts.filter(d => !d.parentDepartmentId);
  const jobTitles: JobTitle[] = Array.isArray(jtRaw) ? jtRaw : (jtRaw as any)?.data ?? [];
  const allEmps: Employee[]   = empRaw?.data ?? [];
  const employees: Employee[] = data?.data ?? [];

  // Sub-departments of selected parent
  const selectedParent = treeDepts.find(d => d.id === parentDeptId);
  const subDepts: Dept[] = selectedParent?.children ?? [];

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { role: 'employee', isManager: false },
  });

  const saveMut = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: any }) =>
      id ? api.patch(`/employees/${id}`, body) : api.post('/employees', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-all'] });
      setOpen(false); reset(); setParentDeptId('');
    },
    onError: (err: any) => {
      const m = err.response?.data?.message;
      setApiError(Array.isArray(m) ? m.join(' — ') : (m ?? 'حدث خطأ'));
    },
  });

  const toggleStatusMut = useMutation({
    mutationFn: (emp: Employee) => api.patch(`/employees/${emp.id}`, { status: emp.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setParentDeptId('');
    reset({ role: 'employee', isManager: false });
    setApiError(''); setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    // find parent of the employee's department
    const empDeptId = e.department?.id ?? '';
    const parent = treeDepts.find(d => d.children?.some(c => c.id === empDeptId));
    const isTopLevel = treeDepts.some(d => d.id === empDeptId && !d.parentDepartmentId);
    setParentDeptId(parent?.id ?? (isTopLevel ? empDeptId : ''));
    const empRole = e.roles?.[0]?.role ?? 'employee';
    reset({
      fullName: e.fullName,
      email: e.email,
      phone: e.phone,
      hireDate: e.hireDate ? e.hireDate.substring(0, 10) : '',
      departmentId: empDeptId,
      jobTitleId: e.jobTitle?.id ?? '',
      directManagerId: e.directManager?.id ?? '',
      role: empRole,
      isManager: empRole === 'manager',
    });
    setApiError(''); setOpen(true);
  };

  const onSubmit = (d: FormData) => {
    const body: any = {
      fullName: d.fullName,
      roles: [d.role],
      isManager: d.role === 'manager',
    };
    if (!editing) body.employeeCode = d.employeeCode;
    if (d.email)           body.email           = d.email;
    if (d.phone)           body.phone           = d.phone;
    if (d.departmentId)    body.departmentId    = d.departmentId;
    if (d.jobTitleId)      body.jobTitleId      = d.jobTitleId;
    if (d.directManagerId) body.directManagerId = d.directManagerId;
    if (d.hireDate)        body.hireDate        = d.hireDate;
    if (!editing && d.password) body.password   = d.password;
    saveMut.mutate({ id: editing?.id, body });
  };

  // ── Excel template ──
  const downloadTemplate = async () => {
    const xlsx = await import('xlsx');
    const wb = xlsx.utils.book_new();

    const headers = EXCEL_COLUMNS.map(c => c.header);

    // صف مثال يوضح طريقة الملء
    const exampleRow = [
      '1001',
      'أحمد محمد علي',
      'Pass@1234',
      'ahmed@company.com',
      '01012345678',
      '2024-01-15',
      allDepts[0]?.name ?? 'اسم الإدارة أو القسم كما هو في الجدول أدناه',
      jobTitles[0]?.title ?? 'المسمى كما هو في جدول المسميات',
      '',
      'employee',
    ];

    const ws = xlsx.utils.aoa_to_sheet([headers, exampleRow]);

    // تنسيق الهيدر
    ws['!cols'] = headers.map(() => ({ wch: 28 }));

    // تلوين صف الهيدر (A1:J1)
    headers.forEach((_h, colIdx) => {
      const cellRef = xlsx.utils.encode_cell({ r: 0, c: colIdx });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = {
        fill: { fgColor: { rgb: '1D4ED8' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center' },
      };
    });

    // تلوين صف المثال بلون فاتح
    exampleRow.forEach((_v, colIdx) => {
      const cellRef = xlsx.utils.encode_cell({ r: 1, c: colIdx });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = { fill: { fgColor: { rgb: 'DBEAFE' } } };
    });

    xlsx.utils.book_append_sheet(wb, ws, 'الموظفون');

    // ── شيت الأقسام المتاحة (اكتب الاسم بالضبط) ──
    const deptRows: any[][] = [
      ['⚠️ اكتب اسم القسم في الشيت الرئيسي بالضبط كما يظهر هنا', '', ''],
      ['اسم القسم / الإدارة', 'النوع', 'عدد الموظفين'],
      ...allDepts.map(d => [
        d.name,
        d.parentDepartmentId ? '   ↳ قسم فرعي' : 'إدارة رئيسية',
        '',
      ]),
    ];
    if (allDepts.length === 0) {
      deptRows.push(['لا توجد أقسام بعد — أضف الأقسام أولاً من صفحة الأقسام', '', '']);
    }
    const wsDept = xlsx.utils.aoa_to_sheet(deptRows);
    wsDept['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 12 }];
    // تلوين العنوان التحذيري
    if (wsDept['A1']) wsDept['A1'].s = { font: { bold: true, color: { rgb: 'B91C1C' } } };
    xlsx.utils.book_append_sheet(wb, wsDept, '⚠️ الأقسام المتاحة');

    // ── شيت المسميات الوظيفية ──
    const jtRows: any[][] = [
      ['⚠️ اكتب المسمى في الشيت الرئيسي بالضبط كما يظهر هنا', ''],
      ['المسمى الوظيفي', ''],
      ...jobTitles.map(j => [j.title, '']),
    ];
    if (jobTitles.length === 0) {
      jtRows.push(['لا توجد مسميات بعد — أضف المسميات أولاً من صفحة المسميات الوظيفية', '']);
    }
    const wsJt = xlsx.utils.aoa_to_sheet(jtRows);
    wsJt['!cols'] = [{ wch: 35 }, { wch: 10 }];
    if (wsJt['A1']) wsJt['A1'].s = { font: { bold: true, color: { rgb: 'B91C1C' } } };
    xlsx.utils.book_append_sheet(wb, wsJt, '⚠️ المسميات المتاحة');

    xlsx.writeFile(wb, 'نموذج_استيراد_الموظفين.xlsx');
  };

  // ── Excel upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const xlsx = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = xlsx.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) { alert('الملف فارغ'); setImporting(false); return; }

      const headerRow = rows[0] as string[];
      const fieldMap: Record<string, number> = {};
      EXCEL_COLUMNS.forEach(col => {
        const idx = headerRow.findIndex(h => String(h).includes(col.field) || String(h) === col.header);
        if (idx >= 0) fieldMap[col.field] = idx;
      });
      EXCEL_COLUMNS.forEach((col, i) => { if (fieldMap[col.field] === undefined) fieldMap[col.field] = i; });

      const getCell = (row: any[], field: string) => String(row[fieldMap[field]] ?? '').trim();

      const toImport = rows.slice(1).filter(row => row.some(c => c !== '')).map(row => {
        const deptName = getCell(row, 'departmentName');
        const jtName   = getCell(row, 'jobTitleName');
        const mgrCode  = getCell(row, 'managerCode');
        // Search ALL depts (top + children)
        const dept    = allDepts.find(d => d.name === deptName);
        const jt      = jobTitles.find(j => j.title === jtName);
        const manager = allEmps.find(e => e.employeeCode === mgrCode);
        const role    = getCell(row, 'role') || 'employee';

        return {
          employeeCode:    getCell(row, 'employeeCode'),
          fullName:        getCell(row, 'fullName'),
          password:        getCell(row, 'password') || 'TempPass@123',
          email:           getCell(row, 'email') || undefined,
          phone:           getCell(row, 'phone') || undefined,
          hireDate:        getCell(row, 'hireDate') || undefined,
          departmentId:    dept?.id || undefined,
          jobTitleId:      jt?.id || undefined,
          directManagerId: manager?.id || undefined,
          roles: [role],
          isManager: role === 'manager',
        };
      }).filter(e => e.employeeCode && e.fullName);

      if (toImport.length === 0) { alert('لم يتم العثور على بيانات صالحة'); setImporting(false); return; }

      const { data: result } = await api.post('/employees/bulk', { employees: toImport });
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-all'] });
    } catch (err: any) {
      alert('خطأ: ' + (err.response?.data?.message ?? err.message));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">إدارة الموظفين</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadTemplate} size="sm"><Download size={15} /> تحميل النموذج</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} size="sm" loading={importing}><Upload size={15} /> استيراد Excel</Button>
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
              <div><p className="text-xl font-bold text-green-700">{importResult.success.length}</p><p className="text-xs text-green-600">تم الاستيراد</p></div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
              <XCircle size={18} className="text-red-500" />
              <div><p className="text-xl font-bold text-red-600">{importResult.failed.length}</p><p className="text-xs text-red-500">فشل</p></div>
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="بحث بالاسم أو الكود…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="pr-9" />
        </div>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">كل الموظفين</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        {data?.total !== undefined && (
          <span className="text-sm text-gray-500">إجمالي: <strong>{data.total}</strong></span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        {isLoading ? <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div> : (
          <Table>
            <Thead><tr>
              <Th>الموظف</Th><Th>الكود</Th><Th>المسمى الوظيفي</Th><Th>القسم/الإدارة</Th><Th>المدير</Th><Th>تاريخ التعيين</Th><Th>الحالة</Th><Th>إجراءات</Th>
            </tr></Thead>
            <Tbody>
              {employees.length === 0 ? <EmptyState /> : employees.map(e => (
                <Tr key={e.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                        {getInitials(e.fullName)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{e.fullName}</p>
                        {e.isManager && <span className="text-[10px] text-blue-600 font-medium">مدير</span>}
                      </div>
                    </div>
                  </Td>
                  <Td><span className="font-mono text-xs text-gray-600">{e.employeeCode}</span></Td>
                  <Td><span className="text-sm">{e.jobTitle?.title ?? '—'}</span></Td>
                  <Td><span className="text-sm">{e.department?.name ?? '—'}</span></Td>
                  <Td><span className="text-sm text-gray-500">{e.directManager?.fullName ?? '—'}</span></Td>
                  <Td><span className="text-sm">{formatDate(e.hireDate)}</span></Td>
                  <Td>
                    <button onClick={() => toggleStatusMut.mutate(e)} className="flex items-center gap-1 group" title="تغيير الحالة">
                      {e.status === 'active'
                        ? <><ToggleRight size={20} className="text-green-500" /><span className="text-xs text-green-600">نشط</span></>
                        : <><ToggleLeft size={20} className="text-gray-400" /><span className="text-xs text-gray-400">غير نشط</span></>}
                    </button>
                  </Td>
                  <Td>
                    <Button size="sm" variant="outline" onClick={() => openEdit(e)}><Pencil size={13} /> تعديل</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">صفحة {page} من {Math.ceil(data.total / 20)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={open} onClose={() => { setOpen(false); setParentDeptId(''); }} title={editing ? `تعديل: ${editing.fullName}` : 'إضافة موظف جديد'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل *" {...register('fullName', { required: true })} />
            {!editing
              ? <Input label="كود الموظف *" {...register('employeeCode', { required: !editing })} />
              : <div className="flex flex-col justify-end"><p className="text-xs text-gray-400">الكود لا يمكن تغييره</p></div>
            }
            <Input label="البريد الإلكتروني" type="email" {...register('email')} />
            <Input label="رقم الجوال" {...register('phone')} />
          </div>

          {/* Cascading: إدارة → قسم → مسمى وظيفي */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">الهيكل التنظيمي</p>
            <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              {/* الإدارة (top-level) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-blue-700">الإدارة</label>
                <select
                  className="rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm"
                  value={parentDeptId}
                  onChange={e => {
                    const pid = e.target.value;
                    setParentDeptId(pid);
                    // لو ما عندوش أقسام فرعية → هو نفسه الـ departmentId
                    const parent = treeDepts.find(d => d.id === pid);
                    if (!parent?.children?.length) {
                      setValue('departmentId', pid);
                    } else {
                      setValue('departmentId', '');
                    }
                  }}
                >
                  <option value="">— اختر الإدارة —</option>
                  {topDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* القسم (فرعي) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-blue-700">القسم</label>
                <select
                  className="rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm disabled:opacity-40"
                  disabled={!parentDeptId || subDepts.length === 0}
                  {...register('departmentId')}
                  onChange={e => setValue('departmentId', e.target.value)}
                >
                  <option value="">
                    {!parentDeptId ? '— اختر الإدارة أولاً —'
                      : subDepts.length === 0 ? '— الإدارة بدون أقسام —'
                      : '— اختر القسم —'}
                  </option>
                  {subDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* المسمى الوظيفي */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-blue-700">المسمى الوظيفي</label>
                <select className="rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm" {...register('jobTitleId')}>
                  <option value="">— اختر المسمى —</option>
                  {jobTitles.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">المدير المباشر</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('directManagerId')}>
                <option value="">— بدون مدير —</option>
                {allEmps.filter(e => e.id !== editing?.id).map(e => (
                  <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">الدور</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('role')}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <Input label="تاريخ التعيين" type="date" {...register('hireDate')} />
            {!editing && (
              <Input label="كلمة المرور *" type="password" {...register('password', { required: !editing })} />
            )}
          </div>

          {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => { setOpen(false); setParentDeptId(''); }}>إلغاء</Button>
            <Button type="submit" loading={isSubmitting || saveMut.isPending}>{editing ? 'تحديث البيانات' : 'إضافة الموظف'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

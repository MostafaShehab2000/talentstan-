'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Network, ChevronDown, ChevronRight, Users, User } from 'lucide-react';

interface Employee {
  id: string;
  fullName: string;
  jobTitle?: { name: string };
  profilePhotoUrl?: string;
  department?: { name: string };
  subordinates?: Employee[];
}

interface Department {
  id: string;
  name: string;
  headEmployee?: { id: string; fullName: string; jobTitle?: { name: string } };
  children?: Department[];
  employees?: Employee[];
  _count?: { employees: number };
}

export default function OrgChartPage() {
  const [view, setView] = useState<'dept' | 'manager'>('dept');

  const { data: depts, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments-tree'],
    queryFn: () => api.get('/departments?includeEmployees=true').then(r => r.data?.data ?? r.data ?? []),
  });

  const { data: employees, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees-org'],
    queryFn: () => api.get('/employees?limit=500').then(r => r.data?.data ?? []),
  });

  // Build manager tree
  const buildManagerTree = (emps: Employee[]): Employee[] => {
    const map = new Map<string, Employee & { subordinates: Employee[] }>();
    emps.forEach(e => map.set(e.id, { ...e, subordinates: [] }));
    const roots: Employee[] = [];
    emps.forEach((e: any) => {
      if (e.directManagerId && map.has(e.directManagerId)) {
        map.get(e.directManagerId)!.subordinates!.push(map.get(e.id)!);
      } else {
        roots.push(map.get(e.id)!);
      }
    });
    return roots;
  };

  const managerTree = employees ? buildManagerTree(employees) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network size={22} className="text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">الهيكل التنظيمي</h2>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('dept')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'dept' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            حسب الأقسام
          </button>
          <button
            onClick={() => setView('manager')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'manager' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            حسب المدير
          </button>
        </div>
      </div>

      {view === 'dept' ? (
        loadingDepts ? <Skeleton /> : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {(depts ?? []).length === 0 ? (
              <EmptyOrg />
            ) : (
              <div className="space-y-2">
                {(depts ?? []).filter((d: Department) => !d['parentDepartmentId']).map((dept: Department) => (
                  <DeptNode key={dept.id} dept={dept} allDepts={depts ?? []} depth={0} />
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        loadingEmp ? <Skeleton /> : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {managerTree.length === 0 ? (
              <EmptyOrg />
            ) : (
              <div className="space-y-2">
                {managerTree.map(emp => (
                  <ManagerNode key={emp.id} emp={emp} depth={0} />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function DeptNode({ dept, allDepts, depth }: { dept: Department; allDepts: Department[]; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const children = allDepts.filter((d: any) => d.parentDepartmentId === dept.id);
  const hasChildren = children.length > 0;
  const empCount = dept._count?.employees ?? 0;

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${depth === 0 ? 'bg-blue-50 border border-blue-100' : ''}`}
        style={{ marginRight: `${depth * 24}px` }}
        onClick={() => hasChildren && setOpen(v => !v)}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${depth === 0 ? 'bg-blue-600 text-white' : depth === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          <Users size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{dept.name}</p>
          {dept.headEmployee && (
            <p className="text-xs text-gray-400 truncate">رئيس القسم: {dept.headEmployee.fullName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {empCount > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{empCount} موظف</span>
          )}
          {hasChildren && (
            open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />
          )}
        </div>
      </div>
      {open && hasChildren && (
        <div className="mt-1 space-y-1 border-r-2 border-dashed border-gray-200 mr-7">
          {children.map(child => (
            <DeptNode key={child.id} dept={child} allDepts={allDepts} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ManagerNode({ emp, depth }: { emp: Employee; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasSubordinates = (emp.subordinates?.length ?? 0) > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${depth === 0 ? 'bg-purple-50 border border-purple-100' : ''}`}
        style={{ marginRight: `${depth * 24}px` }}
        onClick={() => hasSubordinates && setOpen(v => !v)}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${depth === 0 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {emp.fullName?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{emp.fullName}</p>
          <p className="text-xs text-gray-400 truncate">{emp.jobTitle?.name ?? emp.department?.name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSubordinates && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{emp.subordinates!.length} مرؤوس</span>
          )}
          {hasSubordinates && (
            open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />
          )}
        </div>
      </div>
      {open && hasSubordinates && (
        <div className="mt-1 space-y-1 border-r-2 border-dashed border-purple-100 mr-7">
          {emp.subordinates!.map(sub => (
            <ManagerNode key={sub.id} emp={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${100 - i * 8}%` }} />
      ))}
    </div>
  );
}

function EmptyOrg() {
  return (
    <div className="text-center py-16 text-gray-400">
      <Network size={40} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">لا توجد بيانات بعد</p>
    </div>
  );
}

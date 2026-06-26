'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Users, FolderTree, GitBranch,
  CalendarDays, Briefcase, MessageSquare, HelpCircle,
  FileText, ClipboardList, BarChart3, TrendingUp, Settings, LogOut, ScrollText, Fingerprint,
} from 'lucide-react';
import { clearSession } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const superAdminNav: NavItem[] = [
  { href: '/super-admin', label: 'لوحة التحكم', icon: <LayoutDashboard size={18} /> },
  { href: '/super-admin/tenants', label: 'الشركات', icon: <Building2 size={18} /> },
];

const adminNav: NavItem[] = [
  { href: '/admin', label: 'لوحة التحكم', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/employees', label: 'الموظفون', icon: <Users size={18} /> },
  { href: '/admin/departments', label: 'الأقسام', icon: <FolderTree size={18} /> },
  { href: '/admin/job-titles', label: 'المسميات الوظيفية', icon: <Briefcase size={18} /> },
  { href: '/admin/workflow', label: 'مسارات الموافقة', icon: <GitBranch size={18} /> },
  { href: '/admin/attendance', label: 'الحضور والانصراف', icon: <Fingerprint size={18} /> },
  { href: '/admin/leave', label: 'الإجازات', icon: <CalendarDays size={18} /> },
  { href: '/admin/other-requests', label: 'طلبات الإذن والخطابات', icon: <ScrollText size={18} /> },
  { href: '/admin/recruitment', label: 'التوظيف', icon: <Briefcase size={18} /> },
  { href: '/admin/helpdesk', label: 'الدعم الفني', icon: <HelpCircle size={18} /> },
  { href: '/admin/payslips', label: 'الرواتب', icon: <FileText size={18} /> },
  { href: '/admin/surveys', label: 'الاستطلاعات', icon: <ClipboardList size={18} /> },
  { href: '/admin/appraisal', label: 'التقييمات', icon: <BarChart3 size={18} /> },
  { href: '/admin/communication', label: 'التواصل الداخلي', icon: <MessageSquare size={18} /> },
  { href: '/admin/reports', label: 'التقارير', icon: <TrendingUp size={18} /> },
];

export function Sidebar({ type }: { type: 'super-admin' | 'admin' }) {
  const pathname = usePathname();
  const navItems = type === 'super-admin' ? superAdminNav : adminNav;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">T</div>
        <span className="font-semibold text-gray-900 text-lg">Talentstan</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.split('/').length > 2);
          return (
            <Link
              key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={() => { clearSession(); window.location.href = '/login'; }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

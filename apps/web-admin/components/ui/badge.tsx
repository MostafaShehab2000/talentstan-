import { cn, statusColor } from '@/lib/utils';

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(status), className)}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function Tag({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colors[color] ?? colors.gray)}>
      {children}
    </span>
  );
}

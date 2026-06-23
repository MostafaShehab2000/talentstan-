import { cn } from '@/lib/utils';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('border-b border-gray-200 px-6 py-4', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-base font-semibold text-gray-900', className)}>{children}</h3>;
}

export function StatCard({
  title, value, subtitle, icon, trend, color = 'blue',
}: {
  title: string; value: string | number; subtitle?: string;
  icon?: React.ReactNode; trend?: number; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        {icon && <div className={cn('rounded-lg p-2.5', colors[color] ?? colors.blue)}>{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          {trend !== undefined && (
            <p className={cn('mt-1 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm text-left', className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">{children}</thead>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 font-medium', className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-gray-700', className)}>{children}</td>;
}

export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      className={cn('hover:bg-gray-50 transition-colors', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function EmptyState({ message = 'لا توجد بيانات' }: { message?: string }) {
  return (
    <tr>
      <td colSpan={100} className="py-12 text-center text-gray-400 text-sm">{message}</td>
    </tr>
  );
}

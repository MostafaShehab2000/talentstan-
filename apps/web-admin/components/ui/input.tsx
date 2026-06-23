import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      ref={ref} id={id}
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400',
        'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
        'disabled:bg-gray-50 disabled:cursor-not-allowed',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Input.displayName = 'Input';
export { Input };

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, id, options, placeholder, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      ref={ref} id={id}
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
        'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
        'disabled:bg-gray-50 disabled:cursor-not-allowed',
        error && 'border-red-500',
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Select.displayName = 'Select';
export { Select };

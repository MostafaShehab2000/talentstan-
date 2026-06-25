'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getUser, AuthUser } from '@/lib/auth';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function Topbar({ title }: { title?: string }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { setUser(getUser()); }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title ?? 'لوحة التحكم'}</h1>
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell size={18} />
        </button>
        {user && (
          <div className="flex items-center gap-2.5">
            {user.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt={user.fullName} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                {initials(user.fullName)}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
              <p className="text-xs text-gray-400">{user.roles?.[0]?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

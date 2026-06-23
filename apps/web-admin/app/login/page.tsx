'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  tenantId: z.string().optional(),
  loginType: z.enum(['super_admin', 'hr_admin']),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { loginType: 'hr_admin' },
  });

  const loginType = watch('loginType');

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      let res;
      if (data.loginType === 'super_admin') {
        res = await api.post('/auth/super-admin/login', { email: data.email, password: data.password });
      } else {
        res = await api.post('/auth/login', {
          email: data.email,
          password: data.password,
          tenantId: data.tenantId,
        });
      }
      const { accessToken, refreshToken, employee } = res.data;
      setSession(accessToken, refreshToken, {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email ?? data.email,
        roles: employee.roles?.map((r: any) => r.role) ?? [],
        tenantId: employee.tenantId ?? null,
        profilePhotoUrl: employee.profilePhotoUrl,
      });
      if (data.loginType === 'super_admin') {
        router.push('/super-admin');
      } else {
        router.push('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'بيانات الدخول غير صحيحة');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-2xl mb-4">T</div>
          <h1 className="text-2xl font-bold text-gray-900">Talentstan</h1>
          <p className="text-gray-500 text-sm mt-1">منصة إدارة الموارد البشرية</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Login type toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <label className="flex-1">
              <input type="radio" value="hr_admin" {...register('loginType')} className="sr-only" />
              <span className={`block text-center py-2 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors ${loginType === 'hr_admin' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>
                HR Admin
              </span>
            </label>
            <label className="flex-1">
              <input type="radio" value="super_admin" {...register('loginType')} className="sr-only" />
              <span className={`block text-center py-2 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors ${loginType === 'super_admin' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}>
                Super Admin
              </span>
            </label>
          </div>

          <Input label="البريد الإلكتروني" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
          <Input label="كلمة المرور" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />

          {loginType === 'hr_admin' && (
            <Input label="معرّف الشركة (Tenant ID)" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" error={errors.tenantId?.message} {...register('tenantId')} />
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            تسجيل الدخول
          </Button>
        </form>
      </div>
    </div>
  );
}

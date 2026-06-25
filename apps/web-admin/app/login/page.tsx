'use client';
import { useState, useRef } from 'react';

const API = '/api';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'super_admin' | 'hr_admin'>('hr_admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleLogin() {
    setError('');
    const identifier = identifierRef.current?.value?.trim() ?? '';
    const password = passwordRef.current?.value ?? '';

    if (!identifier) { setError('أدخل البريد الإلكتروني أو كود الموظف'); return; }
    if (!password) { setError('أدخل كلمة المرور'); return; }

    setLoading(true);
    try {
      const url = loginType === 'super_admin'
        ? `${API}/auth/super-admin/login`
        : `${API}/auth/login`;

      const body = loginType === 'super_admin'
        ? { email: identifier, password }
        : { identifier, password };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message;
        setError(Array.isArray(msg) ? msg.join(' — ') : (msg ?? 'بيانات الدخول غير صحيحة'));
        return;
      }

      // حفظ التوكنز في cookies
      const max15m = 60 * 15;
      const max7d = 60 * 60 * 24 * 7;
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${max15m}`;
      document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=${max7d}`;

      if (loginType === 'super_admin') {
        const user = JSON.stringify({ id: 'super-admin', fullName: 'Super Admin', email: identifier, roles: ['super_admin'], tenantId: null });
        document.cookie = `user=${encodeURIComponent(user)}; path=/; max-age=${max7d}`;
        window.location.href = '/super-admin';
      } else {
        const emp = data.employee;
        const user = JSON.stringify({
          id: emp.id, fullName: emp.fullName,
          email: emp.email ?? identifier,
          roles: emp.roles?.map((r: any) => r.role) ?? [],
          tenantId: emp.tenantId ?? null,
          profilePhotoUrl: emp.profilePhotoUrl ?? null,
        });
        document.cookie = `user=${encodeURIComponent(user)}; path=/; max-age=${max7d}`;
        window.location.href = '/admin';
      }
    } catch (err: any) {
      setError('خطأ في الاتصال بالخادم — تأكد إن الـ API شغال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', padding: 40 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', width: 56, height: 56, background: '#2563eb', borderRadius: 16, alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>T</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Talentstan</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>منصة إدارة الموارد البشرية</p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', flexDirection: 'row', background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4, direction: 'ltr' }}>
          <button
            type="button"
            onClick={() => { setLoginType('super_admin'); setError(''); }}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              background: loginType === 'super_admin' ? 'white' : 'transparent',
              color: loginType === 'super_admin' ? '#2563eb' : '#6b7280',
              boxShadow: loginType === 'super_admin' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => { setLoginType('hr_admin'); setError(''); }}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              background: loginType === 'hr_admin' ? 'white' : 'transparent',
              color: loginType === 'hr_admin' ? '#2563eb' : '#6b7280',
              boxShadow: loginType === 'hr_admin' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            HR Admin
          </button>
        </div>

        {/* Active mode label */}
        <div style={{ textAlign: 'center', fontSize: 12, color: loginType === 'super_admin' ? '#2563eb' : '#6b7280', fontWeight: 600, marginBottom: 16, background: loginType === 'super_admin' ? '#eff6ff' : '#f9fafb', borderRadius: 6, padding: '4px 8px' }}>
          {loginType === 'super_admin' ? '🔑 Super Admin Mode' : '👤 HR Admin Mode'}
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, textAlign: 'right' }}>
            {loginType === 'super_admin' ? 'البريد الإلكتروني' : 'البريد الإلكتروني أو كود الموظف'}
          </label>
          <input
            ref={identifierRef}
            type="text"
            defaultValue=""
            placeholder={loginType === 'super_admin' ? 'admin@talentstan.com' : 'you@company.com'}
            autoComplete="username"
            dir="ltr"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
              border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, textAlign: 'right' }}>
            كلمة المرور
          </label>
          <input
            ref={passwordRef}
            type="password"
            defaultValue=""
            placeholder="••••••••"
            autoComplete="current-password"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
              border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16, textAlign: 'right' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          disabled={loading}
          onClick={handleLogin}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: loading ? '#93c5fd' : '#2563eb', color: 'white',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
        </button>
      </div>
    </div>
  );
}

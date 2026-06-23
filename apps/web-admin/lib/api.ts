import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = Cookies.get('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, { refreshToken: refresh });
          Cookies.set('access_token', data.accessToken, { expires: 1 / 96 }); // 15 min
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          Cookies.remove('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;

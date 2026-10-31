// ==============================================================================
// API BASE URL (Switch between Local/Proxy and Direct Production Render)
// ==============================================================================
// Option 1: LOCAL / PROXIED (Default - uses Vite proxy)
const API_BASE = import.meta.env.VITE_API_URL || '';

// Option 2: DIRECT PRODUCTION RENDER (Uncomment to call Render API directly)
// const API_BASE = 'https://nexus-4zj1.onrender.com';

export async function api(path, options = {}) {
  const cookieCsrf = typeof document !== 'undefined'
    ? (document.cookie.split('; ').find(x => x.startsWith('nexus_csrf='))?.slice('nexus_csrf='.length) || '')
    : '';
  const storageCsrf = (typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_csrf_token') : '') || '';
  const csrf = cookieCsrf || storageCsrf;

  const storageToken = (typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_session_token') : '') || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}),
    ...(storageToken ? { 'Authorization': `Bearer ${storageToken}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });

  if (response.status === 204) return null;

  const result = await response.json().catch(() => ({ error: { message: 'Service unavailable.' } }));

  if (!response.ok) {
    if (response.status === 401 && typeof localStorage !== 'undefined') {
      localStorage.removeItem('nexus_session_token');
    }
    const error = new Error(result.error?.message || 'Request failed.');
    error.code = result.error?.code;
    error.status = response.status;
    throw error;
  }

  if (typeof localStorage !== 'undefined') {
    const token = result.token || result.data?.token;
    if (token) localStorage.setItem('nexus_session_token', token);
    const csrfToken = result.csrf || result.data?.csrf;
    if (csrfToken) localStorage.setItem('nexus_csrf_token', csrfToken);
  }

  return result.data;
}

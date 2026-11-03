const TOKEN_KEY = 'fer_token';

let unauthorizedHandler = () => {};

export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler;
};

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const saveToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Browser tanpa localStorage: user cukup login ulang setelah halaman dimuat ulang.
  }
};

export const hasToken = () => Boolean(readToken());

// FastAPI mengirim `detail` berupa teks, atau daftar kesalahan validasi (status 422).
export const errorMessage = (body, status) => {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const field = detail[0].loc?.at(-1);
    const hints = {
      username: 'Username 3-30 karakter: huruf, angka, titik, atau garis bawah',
      password: 'Password minimal 8 karakter',
      full_name: 'Nama lengkap maksimal 100 karakter',
    };
    return hints[field] ?? 'Data yang dikirim tidak valid';
  }
  if (status === 413) return 'Ukuran foto terlalu besar';
  return 'Server tidak dapat dihubungi';
};

const request = async (path, { method = 'GET', json, form, auth = true } = {}) => {
  const headers = {};
  const token = readToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: json ? JSON.stringify(json) : form,
  });
  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);
  if (res.status === 401 && auth) {
    saveToken(null);
    unauthorizedHandler();
  }
  if (!res.ok) throw new Error(errorMessage(body, res.status));
  return body;
};

export const register = (data) => request('/auth/register', { method: 'POST', json: data, auth: false });

export const login = async (data) => {
  const result = await request('/auth/login', { method: 'POST', json: data, auth: false });
  saveToken(result.access_token);
  return result.user;
};

export const logout = () => saveToken(null);
export const getMe = () => request('/auth/me');

export const predict = (image, source, { saveHistory = true } = {}) => {
  const form = new FormData();
  form.append('file', image, source === 'webcam' ? 'webcam.jpg' : image.name ?? 'foto.jpg');
  form.append('source', source);
  form.append('save_history', String(saveHistory));
  return request('/predict', { method: 'POST', form });
};

export const getHistory = (offset = 0, limit = 20) => request(`/history?limit=${limit}&offset=${offset}`);
export const deleteHistoryItem = (id) => request(`/history/${id}`, { method: 'DELETE' });
export const clearHistory = () => request('/history', { method: 'DELETE' });
export const getStats = (days) => request(`/stats?hari=${days}`);
export const getModelInfo = () => request('/model-info', { auth: false });

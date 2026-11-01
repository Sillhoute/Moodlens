const request = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, options);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message ?? 'Server tidak dapat dihubungi');
  return body;
};

export const getHealth = () => request('/health');

export const predict = (image, { models, source = 'upload', save = true }) => {
  const form = new FormData();
  form.append('image', image);
  form.append('models', models.join(','));
  form.append('source', source);
  form.append('save', String(save));
  return request('/predictions', { method: 'POST', body: form });
};

export const getHistory = () => request('/predictions');
export const getStats = () => request('/predictions/stats');
export const clearHistory = () => request('/predictions', { method: 'DELETE' });

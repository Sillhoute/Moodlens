const request = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message ?? 'Server tidak dapat dihubungi');
  return body;
};

export const getHealth = () => request('/health');
export const getTasks = () => request('/tasks');
export const createTask = (task) =>
  request('/tasks', { method: 'POST', body: JSON.stringify(task) });
export const updateTask = (id, changes) =>
  request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });

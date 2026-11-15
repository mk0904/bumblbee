let csrf = '';
export function setCsrf(value) {
  csrf = value ?? '';
}
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.method && options.method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message ?? 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}
export const requestKey = () => ({ 'Idempotency-Key': crypto.randomUUID() });

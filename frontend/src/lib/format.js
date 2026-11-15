export const terminal = (state) => ['COMPLETED', 'FAILED', 'INTERRUPTED'].includes(state);
export const fmt = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
export const duration = (seconds) => `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
export const date = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

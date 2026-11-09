import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../src/components/ThemeToggle.jsx';
import { applyTheme, readTheme } from '../src/lib/theme.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test('theme defaults to light and restores a saved dark preference', () => {
  expect(readTheme()).toBe('light');
  applyTheme('dark');
  expect(readTheme()).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('theme toggle updates the whole document and persists across remounts', async () => {
  const user = userEvent.setup();
  applyTheme('light');
  const view = render(<ThemeToggle />);
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  view.unmount();
  render(<ThemeToggle />);
  await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(readTheme()).toBe('light');
});

test('blocked storage still allows changing theme in the current tab', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(readTheme()).toBe('light');
  applyTheme('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

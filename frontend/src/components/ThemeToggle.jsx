import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, readTheme } from '../lib/theme.js';

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? readTheme());
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
  return (
    <button className={`theme-toggle ${className}`} aria-label={label} title={label} onClick={() => {
      const next = theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      setTheme(next);
    }}>
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

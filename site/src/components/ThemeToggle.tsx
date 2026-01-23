import { Monitor, Moon, Sun } from 'lucide-react';

import { useEffect, useState } from 'react';
import { THEME_KEY } from '@/consts';
import ToggleGroup from './ToggleGroup';

type Preference = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';

const themeOptions = [
  { value: 'system' as const, label: <Monitor size={14} aria-hidden="true" />, 'aria-label': 'System' },
  { value: 'light' as const, label: <Sun size={14} aria-hidden="true" />, 'aria-label': 'Light' },
  { value: 'dark' as const, label: <Moon size={14} aria-hidden="true" />, 'aria-label': 'Dark' },
];

function initPreference(): Preference {
  if (typeof localStorage === 'undefined') return 'system';
  if (localStorage[THEME_KEY] === 'light') return 'light';
  if (localStorage[THEME_KEY] === 'dark') return 'dark';
  if (localStorage[THEME_KEY] === 'system') return 'system';
  // Shouldn't be possible after head script runs, but handle it
  localStorage[THEME_KEY] = 'system';
  return 'system';
}

function getThemeFromPreference(preference: Preference): Theme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  if (preference === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return 'light';
}

export function ThemeToggle() {
  const [preference, _setPreference] = useState<Preference | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const setPreference = (newPreference: Preference) => {
    _setPreference(newPreference);
    if (typeof localStorage !== 'undefined') localStorage[THEME_KEY] = newPreference;
    setTheme(getThemeFromPreference(newPreference));
  };

  // Initialize preference and theme on mount
  useEffect(() => {
    const initialPreference = initPreference();
    _setPreference(initialPreference);
    setTheme(getThemeFromPreference(initialPreference));
  }, []);

  // Listen to media query changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return;
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;

    const onMediaChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', onMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', onMediaChange);
    };
  }, [preference]);

  // Keep document.documentElement and theme-color in sync with theme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ebe4c1');
    } else if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#393836');
    }

    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);

  return (
    <ToggleGroup
      disabled={preference === null}
      value={preference ? [preference] : []}
      onChange={(values) => {
        if (values.length > 0) setPreference(values[0]);
      }}
      options={themeOptions}
    />
  );
}

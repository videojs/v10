'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { THEME_COLOR, THEME_KEY } from '@/consts';

type Preference = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';

function ComputerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="17" width="10" height="4" stroke="currentColor" />
      <rect x="2" y="3" width="20" height="14" rx="1" stroke="currentColor" />
      <path d="M2 14H22V16C22 16.5523 21.5523 17 21 17H3C2.44772 17 2 16.5523 2 16V14Z" stroke="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11.4941 17.9766C11.661 17.9905 11.8296 18 12 18C12.1664 18 12.3311 17.9908 12.4941 17.9775V23H11.4941V17.9766ZM17.9375 21.2734L17.0723 21.7744L14.5615 17.4258C14.8646 17.2824 15.1531 17.1139 15.4258 16.9238L17.9375 21.2734ZM8.57227 16.9238C8.84506 17.1141 9.1342 17.2823 9.4375 17.4258L6.92773 21.7734L6.0625 21.2734L8.57227 16.9238ZM6.56836 14.5508C6.71125 14.8545 6.87959 15.1437 7.06934 15.417L2.7207 17.9287L2.2207 17.0625L6.56836 14.5508ZM21.7793 17.0625L21.2793 17.9287L16.9297 15.417C17.1193 15.1439 17.2878 14.8552 17.4307 14.5518L21.7793 17.0625ZM23 11.4951V12.4951H17.9775C17.9909 12.3318 18 12.1668 18 12C18 11.8299 17.9914 11.6616 17.9775 11.4951H23ZM6.02246 11.4951C6.00859 11.6616 6 11.8299 6 12C6 12.1668 6.00911 12.3318 6.02246 12.4951H1V11.4951H6.02246ZM7.0752 8.57227C6.88482 8.84528 6.71678 9.13492 6.57324 9.43848L2.22656 6.92871L2.72656 6.0625L7.0752 8.57227ZM21.7734 6.92871L17.4258 9.4375C17.2823 9.1342 17.1141 8.84506 16.9238 8.57227L21.2734 6.0625L21.7734 6.92871ZM9.44727 6.56934C9.144 6.71214 8.85492 6.87981 8.58203 7.06934L6.07227 2.72168L6.9375 2.22168L9.44727 6.56934ZM17.9277 2.72168L15.416 7.06836C15.1434 6.87918 14.8547 6.71191 14.5518 6.56934L17.0625 2.22168L17.9277 2.72168ZM12.4941 6.02148C12.3311 6.00819 12.1664 6 12 6C11.8296 6 11.661 6.00853 11.4941 6.02246V1H12.4941V6.02148Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.66602 7.83301L8.16602 7.83298V7.83301H8.66602ZM2 12H1.5V12L2 12ZM21.7831 12.8002L22.1575 13.1315L21.7831 12.8002ZM21.9605 12.8732L21.4624 12.8301L21.9605 12.8732ZM11.1969 2.217L11.5283 2.59137L11.1969 2.217ZM11.1969 2.217L10.8655 1.84263C9.21105 3.30733 8.16614 5.44808 8.16602 7.83298L8.66602 7.83301L9.16602 7.83303C9.16613 5.74663 10.079 3.87451 11.5283 2.59137L11.1969 2.217ZM8.66602 7.83301H8.16602C8.16602 12.2513 11.7477 15.833 16.166 15.833V15.333V14.833C12.3 14.833 9.16602 11.699 9.16602 7.83301H8.66602ZM16.166 15.333V15.833C18.552 15.833 20.6928 14.787 22.1575 13.1315L21.7831 12.8002L21.4086 12.4689C20.1254 13.9193 18.2532 14.833 16.166 14.833V15.333ZM21.9605 12.8732L21.4624 12.8301C21.0421 17.6879 16.9667 21.5 12 21.5V22V22.5C17.4904 22.5 21.9941 18.2863 22.4587 12.9163L21.9605 12.8732ZM12 22V21.5C6.75333 21.5 2.50005 17.2467 2.5 12L2 12L1.5 12C1.50005 17.7989 6.20104 22.5 12 22.5V22ZM2 12H2.5C2.5 7.03415 6.31064 2.95921 11.1671 2.53768L11.1238 2.03955L11.0806 1.54142C5.71207 2.0074 1.5 6.51065 1.5 12H2ZM21.7831 12.8002L22.1575 13.1315C22.0328 13.2725 21.846 13.2917 21.7101 13.2362C21.5715 13.1797 21.4453 13.0276 21.4624 12.8301L21.9605 12.8732L22.4587 12.9163C22.5118 12.3021 21.7669 12.0639 21.4086 12.4689L21.7831 12.8002ZM11.1969 2.217L11.5283 2.59137C11.9332 2.23292 11.6949 1.48811 11.0806 1.54142L11.1238 2.03955L11.1671 2.53768C10.9696 2.55482 10.8175 2.42865 10.7609 2.29011C10.7054 2.15421 10.7246 1.96738 10.8655 1.84263L11.1969 2.217Z"
        fill="currentColor"
      />
    </svg>
  );
}

const themeOptions: { value: Preference; icon: ReactNode; label: string }[] = [
  { value: 'system', icon: <ComputerIcon />, label: 'System' },
  { value: 'light', icon: <SunIcon />, label: 'Light' },
  { value: 'dark', icon: <MoonIcon />, label: 'Dark' },
];

function initPreference(): Preference {
  if (typeof localStorage === 'undefined') return 'system';
  if (localStorage[THEME_KEY] === 'light') return 'light';
  if (localStorage[THEME_KEY] === 'dark') return 'dark';
  if (localStorage[THEME_KEY] === 'system') return 'system';
  // Shouldn't be possible after the head script runs, but handle it.
  localStorage[THEME_KEY] = 'system';
  return 'system';
}

function getThemeFromPreference(preference: Preference): Theme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
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

  // Initialize preference and theme on mount.
  useEffect(() => {
    const initialPreference = initPreference();
    _setPreference(initialPreference);
    setTheme(getThemeFromPreference(initialPreference));
  }, []);

  // Track the system preference while 'system' is selected.
  useEffect(() => {
    if (preference !== 'system') return;
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = (event: MediaQueryListEvent) => setTheme(event.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', onMediaChange);

    return () => mediaQuery.removeEventListener('change', onMediaChange);
  }, [preference]);

  // Keep document.documentElement and the theme-color meta in sync with theme.
  useEffect(() => {
    if (typeof document === 'undefined' || theme === null) return;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      themeColorMeta?.setAttribute('content', THEME_COLOR.dark);
    } else {
      document.documentElement.classList.remove('dark');
      themeColorMeta?.setAttribute('content', THEME_COLOR.light);
    }
  }, [theme]);

  const disabled = preference === null;

  return (
    <fieldset
      aria-label="Color theme"
      className="m-0 flex min-w-0 items-center rounded-xs border border-faded-black bg-manila-light/80 p-0.75 backdrop-blur dark:border-manila-light dark:bg-faded-black/80"
    >
      {themeOptions.map((option) => {
        const isPressed = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isPressed}
            disabled={disabled}
            onClick={() => setPreference(option.value)}
            className={`flex items-center justify-center px-3 py-2 transition-colors ${
              disabled ? 'cursor-wait opacity-50' : 'cursor-pointer'
            } ${
              isPressed
                ? 'bg-faded-black text-manila-light dark:bg-manila-light dark:text-faded-black'
                : 'bg-transparent text-faded-black dark:text-manila-light'
            }`}
          >
            {option.icon}
          </button>
        );
      })}
    </fieldset>
  );
}

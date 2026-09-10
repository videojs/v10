import { useStore } from '@nanostores/react';

import Computer from '@/assets/icons/computer.svg?react';
import Moon from '@/assets/icons/moon.svg?react';
import Sun from '@/assets/icons/sun.svg?react';
import { themePreference } from '@/stores/appearance';
import useIsHydrated from '@/utils/useIsHydrated';

import ToggleGroup from './ToggleGroup';

const themeOptions = [
  { value: 'system' as const, label: <Computer className="size-6" aria-hidden="true" />, 'aria-label': 'System' },
  { value: 'light' as const, label: <Sun className="size-6" aria-hidden="true" />, 'aria-label': 'Light' },
  { value: 'dark' as const, label: <Moon className="size-6" aria-hidden="true" />, 'aria-label': 'Dark' },
];

/** Footer theme switch. The preference lives in the appearance store, shared with the nav's appearance menu. */
export function ThemeToggle() {
  const preference = useStore(themePreference);
  const isHydrated = useIsHydrated();

  return (
    <ToggleGroup
      aria-label="Color theme"
      disabled={!isHydrated}
      value={isHydrated ? [preference] : []}
      onChange={(values) => {
        if (values.length > 0) themePreference.set(values[0]);
      }}
      options={themeOptions}
      minimal
    />
  );
}

import { Popover } from '@base-ui/react/popover';
import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import Check from '@/assets/icons/check.svg?react';
import Computer from '@/assets/icons/computer-16.svg?react';
import Moon from '@/assets/icons/moon-16.svg?react';
import Paintbrush from '@/assets/icons/paintbrush.svg?react';
import Sun from '@/assets/icons/sun-16.svg?react';
import SegmentedControl from '@/components/SegmentedControl';
import {
  type Accent,
  ACCENTS,
  accent as accentStore,
  resolveTheme,
  type ThemePreference,
  themePreference,
  type Tone,
  tone as toneStore,
} from '@/stores/appearance';
import useIsHydrated from '@/utils/useIsHydrated';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: <Computer className="size-4" /> },
  { value: 'light', label: 'Light', icon: <Sun className="size-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="size-4" /> },
] satisfies { value: ThemePreference; label: string; icon: ReactNode }[];

const TONE_OPTIONS = [
  { value: 'soft', label: 'Soft' },
  { value: 'deep', label: 'Deep' },
] satisfies { value: Tone; label: string }[];

/**
 * Swatch colours are fixed brand values rather than theme tokens, since the accent token itself changes with the
 * selection and a swatch must keep showing its own colour.
 */
const ACCENT_SWATCHES = {
  orange: { label: 'Orange', color: '#ff6200' },
  gold: { label: 'Gold', color: '#e08a00' },
  magenta: { label: 'Magenta', color: '#cc3566' },
  red: { label: 'Red', color: '#eb3132' },
} satisfies Record<Accent, { label: string; color: string }>;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-p4 text-muted uppercase select-none">{label}</span>
      {children}
    </div>
  );
}

/** The controls themselves, shared by the nav popover and the mobile drawer. */
export function AppearanceControls({ className }: { className?: string }) {
  const isHydrated = useIsHydrated();
  const preference = useStore(themePreference);
  const currentAccent = useStore(accentStore);
  const currentTone = useStore(toneStore);
  const darkActive = isHydrated && resolveTheme(preference) === 'dark';

  return (
    <div className={clsx('flex flex-col gap-5', className)}>
      <Field label="Theme">
        <SegmentedControl
          value={isHydrated ? preference : null}
          onChange={(value) => themePreference.set(value)}
          options={THEME_OPTIONS}
          aria-label="Color theme"
          pending={!isHydrated}
        />
      </Field>
      <Field label="Dark tone">
        <SegmentedControl
          value={isHydrated ? currentTone : null}
          onChange={(value) => toneStore.set(value)}
          options={TONE_OPTIONS}
          aria-label="Dark surface tone"
          pending={!isHydrated}
          disabled={isHydrated && !darkActive}
        />
        {isHydrated && !darkActive && <span className="text-muted text-p4">Applies when the dark theme is on.</span>}
      </Field>
      <Field label="Accent">
        <div role="radiogroup" aria-label="Accent color" className="flex items-center gap-2.5">
          {ACCENTS.map((value) => {
            const swatch = ACCENT_SWATCHES[value];
            const selected = isHydrated && value === currentAccent;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={swatch.label}
                title={swatch.label}
                disabled={!isHydrated}
                onClick={() => accentStore.set(value)}
                className={clsx(
                  'flex size-7 items-center justify-center rounded-full text-manila-light transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  isHydrated ? 'cursor-pointer' : 'cursor-wait',
                  selected
                    ? 'ring-2 ring-faded-black ring-offset-2 ring-offset-surface-raised dark:ring-manila-light'
                    : ''
                )}
                style={{ backgroundColor: swatch.color }}
              >
                {selected && <Check className="size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

/** Nav button that opens the appearance controls in a small popover. */
export default function AppearanceMenu({ className }: { className?: string }) {
  return (
    <Popover.Root modal={false}>
      <Popover.Trigger
        aria-label="Appearance"
        className={clsx(
          'flex size-10 cursor-pointer items-center justify-center rounded-md corner-squircle intent:bg-hover data-[popup-open]:bg-hover',
          className
        )}
      >
        <Paintbrush className="size-6" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-40">
          <Popover.Popup
            className={clsx(
              'w-88 origin-(--transform-origin) rounded-lg corner-squircle border border-line bg-surface-raised p-4 shadow-lg dark:bg-soot',
              'transition duration-150 ease-out starting-style:scale-95 starting-style:opacity-0 ending-style:scale-95 ending-style:opacity-0 ending-style:duration-100',
              'motion-reduce:transition-none'
            )}
          >
            <AppearanceControls />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

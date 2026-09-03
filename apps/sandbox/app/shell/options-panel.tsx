import { CAPTIONS_MODES, type CaptionsMode } from '@app/shared/captions';
import { SANDBOX_LOCALE_OPTION_GROUPS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import { PLAYER_WIDTH } from '@app/shared/player-frame';
import {
  COLOR_SCHEMES,
  type ColorScheme,
  PRELOAD_VALUES,
  type PreloadValue,
  TEXT_DIRECTIONS,
  type TextDirection,
} from '@app/shared/sandbox-listener';
import { type ReactNode, useId } from 'react';

import { PREFERENCE_QUERIES, type Preferences } from './report';

export type OptionsPanelProps = {
  /** The id the navbar's toggle points at with `aria-controls`. */
  id: string;
  onClose: () => void;
  width: number;
  onWidthChange: (value: number) => void;
  widthDisabled: boolean;
  scheme: ColorScheme;
  onSchemeChange: (value: ColorScheme) => void;
  direction: TextDirection;
  onDirectionChange: (value: TextDirection) => void;
  locale: SandboxLocaleTag;
  onLocaleChange: (value: SandboxLocaleTag) => void;
  accentColor: string;
  onAccentColorChange: (value: string) => void;
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  loop: boolean;
  onLoopChange: (value: boolean) => void;
  preload: PreloadValue;
  onPreloadChange: (value: PreloadValue) => void;
  captions: CaptionsMode;
  onCaptionsChange: (value: CaptionsMode) => void;
  preferences: Preferences;
};

const CAPTIONS_LABELS: Record<CaptionsMode, string> = {
  none: 'None',
  single: 'One track',
  multiple: 'Two tracks',
};

const SCHEME_LABELS: Record<ColorScheme, string> = {
  auto: 'System',
  light: 'Light',
  dark: 'Dark',
};

const DIRECTION_LABELS: Record<TextDirection, string> = {
  auto: 'Locale',
  ltr: 'Left to right',
  rtl: 'Right to left',
};

const ICON_BUTTON =
  'inline-flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50';

/**
 * Everything about the preview that is not the selection itself: how wide the player is, how the page looks, how the
 * media plays, and what the browser reports about its user. Sits beside the preview, so its controls never cover it.
 */
export function OptionsPanel({
  id,
  onClose,
  width,
  onWidthChange,
  widthDisabled,
  scheme,
  onSchemeChange,
  direction,
  onDirectionChange,
  locale,
  onLocaleChange,
  accentColor,
  onAccentColorChange,
  autoplay,
  onAutoplayChange,
  muted,
  onMutedChange,
  loop,
  onLoopChange,
  preload,
  onPreloadChange,
  captions,
  onCaptionsChange,
  preferences,
}: OptionsPanelProps) {
  const schemeId = useId();
  const directionId = useId();
  const localeId = useId();
  const accentColorId = useId();
  const autoplayId = useId();
  const mutedId = useId();
  const loopId = useId();
  const preloadId = useId();
  const captionsId = useId();

  return (
    <aside
      id={id}
      aria-label="Options"
      className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 pr-2 pl-4 dark:border-zinc-800">
        <h2 className="text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">Options</h2>
        <button type="button" aria-label="Close options" onClick={onClose} className={ICON_BUTTON}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <Section title="Preview">
        <WidthControl value={width} onChange={onWidthChange} disabled={widthDisabled} />
        <SelectItem
          id={schemeId}
          label="Color scheme"
          value={scheme}
          onChange={(value) => onSchemeChange(value as ColorScheme)}
          options={COLOR_SCHEMES.map((value) => ({ value, label: SCHEME_LABELS[value] }))}
        />
        <SelectItem
          id={directionId}
          label="Direction"
          value={direction}
          onChange={(value) => onDirectionChange(value as TextDirection)}
          options={TEXT_DIRECTIONS.map((value) => ({ value, label: DIRECTION_LABELS[value] }))}
        />
        <SelectItem
          id={localeId}
          label="Language"
          value={locale}
          onChange={(value) => onLocaleChange(value as SandboxLocaleTag)}
          optionGroups={SANDBOX_LOCALE_OPTION_GROUPS}
        />
        <ColorItem id={accentColorId} value={accentColor} onChange={onAccentColorChange} />
      </Section>

      <Section title="Playback">
        <CheckboxItem id={autoplayId} label="Autoplay" checked={autoplay} onChange={onAutoplayChange} />
        <CheckboxItem id={mutedId} label="Muted" checked={muted} onChange={onMutedChange} />
        <CheckboxItem id={loopId} label="Loop" checked={loop} onChange={onLoopChange} />
        <SelectItem
          id={preloadId}
          label="Preload"
          value={preload}
          onChange={(value) => onPreloadChange(value as PreloadValue)}
          options={PRELOAD_VALUES.map((value) => ({ value, label: value }))}
        />
        <SelectItem
          id={captionsId}
          label="Captions"
          value={captions}
          onChange={(value) => onCaptionsChange(value as CaptionsMode)}
          options={CAPTIONS_MODES.map((value) => ({ value, label: CAPTIONS_LABELS[value] }))}
        />
      </Section>

      <Section title="Detected preferences">
        <PreferenceBadges preferences={preferences} />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <h3
        id={headingId}
        className="mb-2 text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
      >
        {title}
      </h3>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">{children}</div>
    </section>
  );
}

type WidthControlProps = {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
};

/** The player's width in the preview: a slider with ticks where the skins' layouts change, and a field for exact widths. */
function WidthControl({ value, onChange, disabled }: WidthControlProps) {
  const id = useId();
  const stopsId = useId();
  const clamp = (width: number) =>
    Number.isFinite(width) ? Math.min(PLAYER_WIDTH.max, Math.max(PLAYER_WIDTH.min, Math.round(width))) : value;

  return (
    <>
      <label htmlFor={id} className="text-[13px] font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200">
        Width
      </label>
      <div className="flex items-center gap-1 justify-self-end">
        <input
          type="number"
          aria-label="Width in pixels"
          min={PLAYER_WIDTH.min}
          max={PLAYER_WIDTH.max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
          className="h-7 w-16 rounded border-none bg-white bg-clip-border px-2 text-right text-[13px] font-medium text-zinc-950 tabular-nums shadow-xs ring shadow-black/20 ring-zinc-800/10 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:focus:outline-zinc-50"
        />
        <span className="text-[13px] text-zinc-500 dark:text-zinc-400">px</span>
      </div>
      <input
        id={id}
        type="range"
        min={PLAYER_WIDTH.min}
        max={PLAYER_WIDTH.max}
        step={1}
        list={stopsId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        className="col-span-2 h-6 w-full cursor-pointer accent-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:accent-zinc-50"
      />
      <datalist id={stopsId}>
        {PLAYER_WIDTH.stops.map((stop) => (
          <option key={stop} value={stop} />
        ))}
      </datalist>
    </>
  );
}

/** The preferences the skins react to, as the browser reports them; DevTools' rendering emulation flips them live. */
function PreferenceBadges({ preferences }: { preferences: Preferences }) {
  return (
    <ul className="col-span-2 flex flex-wrap gap-1" aria-label="Detected preferences">
      {PREFERENCE_QUERIES.map(([name]) => (
        <li
          key={name}
          data-active={preferences[name]}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 data-[active=true]:bg-zinc-950 data-[active=true]:text-white dark:bg-zinc-800 dark:text-zinc-400 dark:data-[active=true]:bg-zinc-50 dark:data-[active=true]:text-zinc-950"
        >
          {name}: {preferences[name] ? 'on' : 'off'}
        </li>
      ))}
    </ul>
  );
}

type ColorItemProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorItem({ id, value, onChange }: ColorItemProps) {
  const pickerValue = /^#[\da-f]{6}$/i.test(value) ? value : '#ff0000';

  return (
    <>
      <label
        htmlFor={id}
        className="cursor-pointer text-[13px] font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200"
      >
        Accent color
      </label>
      <div className="flex items-center gap-1.5 justify-self-end">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Default"
          spellCheck={false}
          className="h-7 w-24 rounded border-none bg-white bg-clip-border px-2 text-[13px] font-medium text-zinc-950 shadow-xs ring shadow-black/20 ring-zinc-800/10 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:focus:outline-zinc-50"
        />
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Choose accent color"
          className="size-7 cursor-pointer rounded border-none bg-transparent p-0"
        />
      </div>
    </>
  );
}

type CheckboxItemProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function CheckboxItem({ id, label, checked, onChange }: CheckboxItemProps) {
  return (
    <>
      <label
        htmlFor={id}
        className="cursor-pointer text-[13px] font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200"
      >
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 cursor-pointer justify-self-end rounded border-zinc-300 accent-zinc-950 dark:border-zinc-700 dark:accent-zinc-50"
      />
    </>
  );
}

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectOptionGroup = {
  label: string;
  options: SelectOption[];
};

type SelectItemProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  optionGroups?: SelectOptionGroup[];
};

function SelectItem({ id, label, value, onChange, options, optionGroups }: SelectItemProps) {
  return (
    <>
      <label
        htmlFor={id}
        className="cursor-pointer text-[13px] font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200"
      >
        {label}
      </label>
      <div className="relative justify-self-end">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 max-w-40 cursor-pointer appearance-none rounded border-none bg-white bg-clip-border pr-7 pl-2 text-[13px] font-medium text-zinc-950 shadow-xs ring shadow-black/20 ring-zinc-800/10 transition-colors hover:bg-zinc-50 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:hover:bg-zinc-900 dark:focus:outline-zinc-50"
        >
          {optionGroups
            ? optionGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options?.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </>
  );
}

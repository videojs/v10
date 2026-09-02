import type { CompareMode } from '@app/compare';
import { SKIN_SOURCES, type SKINS } from '@app/constants';
import { PLATFORM_LABELS, SKIN_LABELS, SKIN_SOURCE_LABELS, STYLING_LABELS } from '@app/labels';
import { hasSkinChoice, hasTailwindSkin, MEDIA, MEDIA_IDS, type MediaId } from '@app/media';
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
import { skinSourceAvailable, tailwindSkinAvailable } from '@app/shared/skin-sources';
import type { SandboxSource, SourceId } from '@app/shared/sources';
import type { Platform, Skin, SkinSource, Styling } from '@app/types';
import { useEffect, useId, useRef, useState } from 'react';

import { PREFERENCE_QUERIES, type Preferences } from './report';

type NavbarProps = {
  platform: Platform;
  onPlatformChange: (value: Platform) => void;
  styling: Styling;
  onStylingChange: (value: Styling) => void;
  media: MediaId;
  onMediaChange: (value: MediaId) => void;
  skin: Skin;
  onSkinChange: (value: Skin) => void;
  skins: SkinSource;
  onSkinsChange: (value: SkinSource) => void;
  source: SourceId;
  onSourceChange: (value: string) => void;
  width: number;
  onWidthChange: (value: number) => void;
  widthDisabled: boolean;
  compare: CompareMode;
  onCompareChange: (value: CompareMode) => void;
  compareOptions: readonly { value: CompareMode; label: string; disabled: boolean }[];
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  loop: boolean;
  onLoopChange: (value: boolean) => void;
  preload: PreloadValue;
  onPreloadChange: (value: PreloadValue) => void;
  locale: SandboxLocaleTag;
  onLocaleChange: (value: SandboxLocaleTag) => void;
  accentColor: string;
  onAccentColorChange: (value: string) => void;
  scheme: ColorScheme;
  onSchemeChange: (value: ColorScheme) => void;
  direction: TextDirection;
  onDirectionChange: (value: TextDirection) => void;
  preferences: Preferences;
  availableSources: readonly SourceId[];
  platforms: readonly Platform[];
  stylings: readonly Styling[];
  sources: Record<SourceId, SandboxSource>;
};

const SKIN_OPTIONS: readonly Skin[] = ['default', 'minimal'] satisfies readonly (typeof SKINS)[number][];

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

export function Navbar({
  platform,
  onPlatformChange,
  styling,
  onStylingChange,
  media,
  onMediaChange,
  skin,
  onSkinChange,
  skins,
  onSkinsChange,
  source,
  onSourceChange,
  width,
  onWidthChange,
  widthDisabled,
  compare,
  onCompareChange,
  compareOptions,
  autoplay,
  onAutoplayChange,
  muted,
  onMutedChange,
  loop,
  onLoopChange,
  preload,
  onPreloadChange,
  locale,
  onLocaleChange,
  accentColor,
  onAccentColorChange,
  scheme,
  onSchemeChange,
  direction,
  onDirectionChange,
  preferences,
  availableSources,
  platforms,
  stylings,
  sources,
}: NavbarProps) {
  const { fixedSource, outcome } = MEDIA[media];

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-sm font-semibold tracking-tight whitespace-nowrap text-zinc-950 dark:text-zinc-50">
        Video.js v10
      </span>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="flex items-center gap-4 overflow-auto p-2">
        <Select
          label="Platform"
          value={platform}
          onChange={(v) => onPlatformChange(v as Platform)}
          options={platforms.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))}
        />

        <Select
          label="Styling"
          value={styling}
          onChange={(v) => onStylingChange(v as Styling)}
          options={stylings.map((s) => ({
            value: s,
            label: STYLING_LABELS[s],
            disabled: s === 'tailwind' && !(hasTailwindSkin(media, platform) && tailwindSkinAvailable(platform)),
          }))}
        />

        <Select
          label="Media"
          value={media}
          onChange={(v) => onMediaChange(v as MediaId)}
          options={MEDIA_IDS.map((id) => ({ value: id, label: MEDIA[id].label }))}
        />

        <Select
          label="Skin"
          value={skin}
          onChange={(v) => onSkinChange(v as Skin)}
          options={SKIN_OPTIONS.map((s) => ({ value: s, label: SKIN_LABELS[s] }))}
          disabled={!hasSkinChoice(media)}
        />

        <Select
          label="Skins from"
          value={skins}
          onChange={(v) => onSkinsChange(v as SkinSource)}
          options={SKIN_SOURCES.map((value) => ({
            value,
            label: SKIN_SOURCE_LABELS[value],
            disabled: !skinSourceAvailable(value, platform),
          }))}
          disabled={!hasSkinChoice(media) || platform === 'cdn'}
        />

        <Select
          label="Source"
          value={source}
          onChange={onSourceChange}
          options={availableSources.map((id) => {
            const note = outcome?.(sources[id]);

            return { value: id, label: note ? `${sources[id].label} — ${note}` : sources[id].label };
          })}
          disabled={fixedSource !== undefined}
        />

        <WidthControl value={width} onChange={onWidthChange} disabled={widthDisabled} />

        <Select
          label="Compare"
          value={compare}
          onChange={(v) => onCompareChange(v as CompareMode)}
          options={compareOptions.map((option) => ({ ...option }))}
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <SettingsMenu
          autoplay={autoplay}
          onAutoplayChange={onAutoplayChange}
          muted={muted}
          onMutedChange={onMutedChange}
          loop={loop}
          onLoopChange={onLoopChange}
          preload={preload}
          onPreloadChange={onPreloadChange}
          locale={locale}
          onLocaleChange={onLocaleChange}
          accentColor={accentColor}
          onAccentColorChange={onAccentColorChange}
          scheme={scheme}
          onSchemeChange={onSchemeChange}
          direction={direction}
          onDirectionChange={onDirectionChange}
          preferences={preferences}
        />
        <a
          href="https://github.com/videojs/v10"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <span className="sr-only">GitHub repository</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>
      </div>
    </header>
  );
}

type WidthControlProps = {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
};

/** The player's width in the preview, with ticks at the widths the skins' layouts change around. */
function WidthControl({ value, onChange, disabled }: WidthControlProps) {
  const id = useId();
  const stopsId = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
        Width
      </label>
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
        className="h-8 w-28 cursor-pointer accent-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:accent-zinc-50"
      />
      <datalist id={stopsId}>
        {PLAYER_WIDTH.stops.map((stop) => (
          <option key={stop} value={stop} />
        ))}
      </datalist>
      <output htmlFor={id} className="w-14 text-[13px] font-medium text-zinc-700 tabular-nums dark:text-zinc-200">
        {value}px
      </output>
    </div>
  );
}

type SettingsMenuProps = {
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  loop: boolean;
  onLoopChange: (value: boolean) => void;
  preload: PreloadValue;
  onPreloadChange: (value: PreloadValue) => void;
  locale: SandboxLocaleTag;
  onLocaleChange: (value: SandboxLocaleTag) => void;
  accentColor: string;
  onAccentColorChange: (value: string) => void;
  scheme: ColorScheme;
  onSchemeChange: (value: ColorScheme) => void;
  direction: TextDirection;
  onDirectionChange: (value: TextDirection) => void;
  preferences: Preferences;
};

function SettingsMenu({
  autoplay,
  onAutoplayChange,
  muted,
  onMutedChange,
  loop,
  onLoopChange,
  preload,
  onPreloadChange,
  locale,
  onLocaleChange,
  accentColor,
  onAccentColorChange,
  scheme,
  onSchemeChange,
  direction,
  onDirectionChange,
  preferences,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const autoplayId = useId();
  const mutedId = useId();
  const loopId = useId();
  const preloadId = useId();
  const localeId = useId();
  const accentColorId = useId();
  const schemeId = useId();
  const directionId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Clicks inside the preview iframe don't bubble to the parent document, so
    // also close when the parent window loses focus (e.g. iframe takes focus).
    const handleBlur = () => setOpen(false);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Player settings"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 aria-expanded:bg-zinc-100 aria-expanded:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:aria-expanded:bg-zinc-800 dark:aria-expanded:text-zinc-50"
      >
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
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-20 mt-2 grid max-h-[min(24rem,70vh)] auto-rows-[1.75rem] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 overflow-y-auto rounded-md border border-zinc-200 bg-white p-3 shadow-md shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <SelectItem
            id={localeId}
            label="Language"
            value={locale}
            onChange={(value) => onLocaleChange(value as SandboxLocaleTag)}
            optionGroups={SANDBOX_LOCALE_OPTION_GROUPS}
          />
          <ColorItem id={accentColorId} value={accentColor} onChange={onAccentColorChange} />
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
          <PreferenceBadges preferences={preferences} />
        </div>
      )}
    </div>
  );
}

/** The preferences the skins react to, as the browser reports them; DevTools' rendering emulation flips them live. */
function PreferenceBadges({ preferences }: { preferences: Preferences }) {
  return (
    <div className="col-span-2 mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
      <p className="mb-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Detected preferences</p>
      <ul className="flex flex-wrap gap-1" aria-label="Detected preferences">
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
    </div>
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
      <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
        Accent color
      </label>
      <div className="flex items-center gap-1.5 justify-self-start">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Default"
          spellCheck={false}
          className="h-7 w-28 rounded border-none bg-white bg-clip-border px-2 text-[13px] font-medium text-zinc-950 shadow-xs ring shadow-black/20 ring-zinc-800/10 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:focus:outline-zinc-50"
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
      <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 cursor-pointer justify-self-start rounded border-zinc-300 accent-zinc-950 dark:border-zinc-700 dark:accent-zinc-50"
      />
    </>
  );
}

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
      <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </label>
      <div className="relative justify-self-start">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 cursor-pointer appearance-none rounded border-none bg-white bg-clip-border pr-7 pl-2 text-[13px] font-medium text-zinc-950 shadow-xs ring shadow-black/20 ring-zinc-800/10 transition-colors hover:bg-zinc-50 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:hover:bg-zinc-900 dark:focus:outline-zinc-50"
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

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectOptionGroup = {
  label: string;
  options: SelectOption[];
};

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
};

function Select({ label, value, onChange, options, disabled }: SelectProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 appearance-none rounded-md border-none bg-white bg-clip-border pr-8 pl-3 text-[13px] font-medium text-zinc-950 shadow-xs ring shadow-black/20 ring-zinc-800/10 transition-colors hover:bg-zinc-50 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:hover:bg-zinc-900 dark:focus:outline-zinc-50"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
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
    </div>
  );
}

import type { CompareMode } from '@app/compare';
import { SKIN_SOURCES, type SKINS } from '@app/constants';
import { PLATFORM_LABELS, SKIN_LABELS, SKIN_SOURCE_LABELS, STYLING_LABELS } from '@app/labels';
import { hasSkinChoice, hasTailwindSkin, MEDIA, MEDIA_IDS, type MediaId } from '@app/media';
import { skinSourceAvailable, tailwindSkinAvailable } from '@app/shared/skin-sources';
import type { SandboxSource, SourceId } from '@app/shared/sources';
import type { Platform, Skin, SkinSource, Styling } from '@app/types';
import { useId } from 'react';

type NavbarProps = {
  platform: Platform;
  onPlatformChange: (value: Platform) => void;
  media: MediaId;
  onMediaChange: (value: MediaId) => void;
  source: SourceId;
  onSourceChange: (value: string) => void;
  availableSources: readonly SourceId[];
  platforms: readonly Platform[];
  sources: Record<SourceId, SandboxSource>;
  /** The options panel this bar's toggle opens and closes. */
  optionsId: string;
  optionsOpen: boolean;
  onOptionsToggle: () => void;
};

const SKIN_OPTIONS: readonly Skin[] = ['default', 'minimal'] satisfies readonly (typeof SKINS)[number][];

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 aria-expanded:bg-zinc-100 aria-expanded:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:aria-expanded:bg-zinc-800 dark:aria-expanded:text-zinc-50';

/** What plays: the platform, the media, and its source. The skin controls sit in the preview's header below. */
export function Navbar({
  platform,
  onPlatformChange,
  media,
  onMediaChange,
  source,
  onSourceChange,
  availableSources,
  platforms,
  sources,
  optionsId,
  optionsOpen,
  onOptionsToggle,
}: NavbarProps) {
  const { fixedSource, outcome } = MEDIA[media];

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-sm font-semibold tracking-tight whitespace-nowrap text-zinc-950 dark:text-zinc-50">
        Video.js v10
      </span>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="flex min-w-0 items-center gap-4 overflow-x-auto py-2">
        <Select
          label="Platform"
          value={platform}
          onChange={(v) => onPlatformChange(v as Platform)}
          options={platforms.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))}
        />

        <Select
          label="Media"
          value={media}
          onChange={(v) => onMediaChange(v as MediaId)}
          options={MEDIA_IDS.map((id) => ({ value: id, label: MEDIA[id].label }))}
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
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="Options"
          aria-expanded={optionsOpen}
          aria-controls={optionsId}
          onClick={onOptionsToggle}
          className={ICON_BUTTON}
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
            <line x1="21" x2="14" y1="4" y2="4" />
            <line x1="10" x2="3" y1="4" y2="4" />
            <line x1="21" x2="12" y1="12" y2="12" />
            <line x1="8" x2="3" y1="12" y2="12" />
            <line x1="21" x2="16" y1="20" y2="20" />
            <line x1="12" x2="3" y1="20" y2="20" />
            <line x1="14" x2="14" y1="2" y2="6" />
            <line x1="8" x2="8" y1="10" y2="14" />
            <line x1="16" x2="16" y1="18" y2="22" />
          </svg>
        </button>
        <a href="https://github.com/videojs/v10" target="_blank" rel="noopener noreferrer" className={ICON_BUTTON}>
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

type SkinControlsProps = {
  platform: Platform;
  media: MediaId;
  styling: Styling;
  onStylingChange: (value: Styling) => void;
  skin: Skin;
  onSkinChange: (value: Skin) => void;
  skins: SkinSource;
  onSkinsChange: (value: SkinSource) => void;
  compare: CompareMode;
  onCompareChange: (value: CompareMode) => void;
  compareOptions: readonly { value: CompareMode; label: string; disabled: boolean }[];
  stylings: readonly Styling[];
};

/** How it is skinned: the skin, its styling, where the skin comes from, and what to compare it against. */
export function SkinControls({
  platform,
  media,
  styling,
  onStylingChange,
  skin,
  onSkinChange,
  skins,
  onSkinsChange,
  compare,
  onCompareChange,
  compareOptions,
  stylings,
}: SkinControlsProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
      <Select
        label="Skin"
        size="sm"
        value={skin}
        onChange={(v) => onSkinChange(v as Skin)}
        options={SKIN_OPTIONS.map((s) => ({ value: s, label: SKIN_LABELS[s] }))}
        disabled={!hasSkinChoice(media)}
      />

      <Select
        label="Styling"
        size="sm"
        value={styling}
        onChange={(v) => onStylingChange(v as Styling)}
        options={stylings.map((s) => ({
          value: s,
          label: STYLING_LABELS[s],
          disabled: s === 'tailwind' && !(hasTailwindSkin(media, platform) && tailwindSkinAvailable(platform)),
        }))}
      />

      <Select
        label="Skins from"
        size="sm"
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
        label="Compare"
        size="sm"
        value={compare}
        onChange={(v) => onCompareChange(v as CompareMode)}
        options={compareOptions.map((option) => ({ ...option }))}
      />
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** `md` fills the navbar; `sm` fits the preview header. */
  size?: 'md' | 'sm';
};

const SELECT_SIZES = {
  md: {
    label: 'text-[13px]',
    select: 'h-8 rounded-md pr-8 pl-3 text-[13px]',
    chevron: 'right-2 size-3.5',
  },
  sm: {
    label: 'text-xs',
    select: 'h-7 rounded pr-7 pl-2 text-xs',
    chevron: 'right-1.5 size-3',
  },
} as const;

function Select({ label, value, onChange, options, disabled, size = 'md' }: SelectProps) {
  const id = useId();
  const sizes = SELECT_SIZES[size];

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor={id} className={`${sizes.label} font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400`}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${sizes.select} appearance-none border-none bg-white bg-clip-border font-medium text-zinc-950 shadow-xs ring shadow-black/20 ring-zinc-800/10 transition-colors hover:bg-zinc-50 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10 dark:hover:bg-zinc-900 dark:focus:outline-zinc-50`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className={`${sizes.chevron} pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400`}
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

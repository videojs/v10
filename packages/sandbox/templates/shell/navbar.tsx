import type { SKINS } from '../constants';
import type { SourceId } from '../shared/sources';
import type { Platform, Preset, Skin, Styling } from '../types';

type NavbarProps = {
  platform: Platform;
  onPlatformChange: (value: Platform) => void;
  styling: Styling;
  onStylingChange: (value: Styling) => void;
  preset: Preset;
  onPresetChange: (value: Preset) => void;
  skin: Skin;
  onSkinChange: (value: Skin) => void;
  source: SourceId;
  onSourceChange: (value: string) => void;
  availableSources: readonly SourceId[];
  isBackgroundVideo: boolean;
  platforms: readonly Platform[];
  stylings: readonly Styling[];
  presets: readonly Preset[];
  sources: Record<SourceId, { label: string; url: string; type: string }>;
};

const SKIN_OPTIONS: readonly Skin[] = ['default', 'minimal'] satisfies readonly (typeof SKINS)[number][];

const PLATFORM_LABELS: Record<Platform, string> = {
  html: 'HTML',
  react: 'React',
};

const PRESET_LABELS: Record<Preset, string> = {
  video: 'Video',
  audio: 'Audio',
  'background-video': 'Background Video',
};

export function Navbar({
  platform,
  onPlatformChange,
  styling,
  onStylingChange,
  preset,
  onPresetChange,
  skin,
  onSkinChange,
  source,
  onSourceChange,
  availableSources,
  isBackgroundVideo,
  platforms,
  stylings,
  presets,
  sources,
}: NavbarProps) {
  return (
    <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center px-4 h-14 gap-6">
      <span className="text-sm font-semibold tracking-tight whitespace-nowrap text-zinc-950 dark:text-zinc-50">
        Video.js v10
      </span>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="flex items-center gap-4">
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
            label: s === 'css' ? 'CSS' : 'Tailwind',
            disabled: s === 'tailwind' && isBackgroundVideo,
          }))}
        />

        <Select
          label="Preset"
          value={preset}
          onChange={(v) => onPresetChange(v as Preset)}
          options={presets.map((p) => ({ value: p, label: PRESET_LABELS[p] }))}
        />

        <Select
          label="Skin"
          value={skin}
          onChange={(v) => onSkinChange(v as Skin)}
          options={SKIN_OPTIONS.map((s) => ({ value: s, label: capitalize(s) }))}
          disabled={isBackgroundVideo}
        />

        <Select
          label="Source"
          value={source}
          onChange={onSourceChange}
          options={availableSources.map((id) => ({ value: id, label: sources[id].label }))}
          disabled={isBackgroundVideo}
        />
      </div>

      <div className="ml-auto">
        <a
          href="https://github.com/videojs/v10"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center size-8 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
};

function Select({ label, value, onChange, options, disabled }: SelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 appearance-none rounded-md border-none bg-clip-border ring ring-zinc-800/10 dark:ring-white/10 bg-white dark:bg-zinc-900 pl-3 pr-8 text-[13px] font-medium text-zinc-950 dark:text-zinc-50 shadow-xs shadow-black/20 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:outline-2 focus:outline-zinc-950 dark:focus:outline-zinc-50 focus:outline-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 dark:text-zinc-400"
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

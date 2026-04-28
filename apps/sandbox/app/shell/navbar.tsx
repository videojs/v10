import type { SKINS } from '@app/constants';
import { PRELOAD_VALUES, type PreloadValue } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import type { Platform, Preset, Skin, Styling } from '@app/types';
import { useEffect, useId, useRef, useState } from 'react';

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
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  loop: boolean;
  onLoopChange: (value: boolean) => void;
  preload: PreloadValue;
  onPreloadChange: (value: PreloadValue) => void;
  availableSources: readonly SourceId[];
  isBackgroundVideo: boolean;
  isSimpleHlsVideo: boolean;
  isMuxVideo: boolean;
  isMuxAudio: boolean;
  platforms: readonly Platform[];
  stylings: readonly Styling[];
  presets: readonly Preset[];
  sources: Record<SourceId, { label: string; url: string; type: string; subType?: string }>;
};

const SKIN_OPTIONS: readonly Skin[] = ['default', 'minimal'] satisfies readonly (typeof SKINS)[number][];

const PLATFORM_LABELS: Record<Platform, string> = {
  html: 'HTML',
  react: 'React',
  cdn: 'CDN',
};

const PRESET_LABELS: Record<Preset, string> = {
  video: 'Video',
  'hls-video': 'HLS Video',
  'native-hls-video': 'Native HLS Video',
  'mux-video': 'Mux Video',
  'mux-audio': 'Mux Audio',
  'simple-hls-video': 'Simple HLS Video',
  'dash-video': 'DASH Video',
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
  autoplay,
  onAutoplayChange,
  muted,
  onMutedChange,
  loop,
  onLoopChange,
  preload,
  onPreloadChange,
  availableSources,
  isBackgroundVideo,
  isSimpleHlsVideo,
  isMuxVideo,
  isMuxAudio,
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
            label: s === 'css' ? 'CSS' : 'Tailwind',
            disabled: s === 'tailwind' && (isBackgroundVideo || platform === 'cdn'),
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
          options={availableSources
            .filter((id) => {
              if (isSimpleHlsVideo) return sources[id].subType === 'mp4';
              if (isMuxVideo || isMuxAudio) return sources[id].type !== 'dash';
              return true;
            })
            .map((id) => ({ value: id, label: sources[id].label }))}
          disabled={isBackgroundVideo}
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
        />
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

type SettingsMenuProps = {
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  loop: boolean;
  onLoopChange: (value: boolean) => void;
  preload: PreloadValue;
  onPreloadChange: (value: PreloadValue) => void;
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
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const autoplayId = useId();
  const mutedId = useId();
  const loopId = useId();
  const preloadId = useId();

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
        className="inline-flex items-center justify-center size-8 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-800 aria-expanded:text-zinc-950 dark:aria-expanded:text-zinc-50"
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
          className="absolute right-0 top-full mt-2 z-20 grid grid-cols-[1fr_auto] auto-rows-[1.75rem] items-center gap-x-6 gap-y-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-md shadow-black/5"
        >
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
        </div>
      )}
    </div>
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
      <label htmlFor={id} className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer">
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="justify-self-start size-3.5 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-950 dark:accent-zinc-50 cursor-pointer"
      />
    </>
  );
}

type SelectItemProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
};

function SelectItem({ id, label, value, onChange, options }: SelectItemProps) {
  return (
    <>
      <label htmlFor={id} className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer">
        {label}
      </label>
      <div className="relative justify-self-start">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 appearance-none rounded border-none bg-clip-border ring ring-zinc-800/10 dark:ring-white/10 bg-white dark:bg-zinc-900 pl-2 pr-7 text-[13px] font-medium text-zinc-950 dark:text-zinc-50 shadow-xs shadow-black/20 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:outline-2 focus:outline-zinc-950 dark:focus:outline-zinc-50 focus:outline-offset-2 cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-zinc-500 dark:text-zinc-400"
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

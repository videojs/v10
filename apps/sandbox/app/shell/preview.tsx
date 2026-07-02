import type { PreloadValue } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import type { Preset, Skin, Styling } from '@app/types';
import { forwardRef, useState } from 'react';

type PreviewProps = {
  pagePath: string;
  preset: Preset;
  skin: Skin;
  styling: Styling;
  source: SourceId;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  preload: PreloadValue;
};

export const Preview = forwardRef<HTMLIFrameElement, PreviewProps>(function Preview(
  { pagePath, preset, skin, styling, source, autoplay, muted, loop, preload },
  ref
) {
  const buildUrl = (base: string) => {
    const params = new URLSearchParams({
      preset,
      skin,
      styling,
      source,
      autoplay: autoplay ? '1' : '0',
      muted: muted ? '1' : '0',
      loop: loop ? '1' : '0',
      preload,
    });
    return `${base}?${params}`;
  };

  // Capture the initial query so the iframe doesn't reload when autoplay/muted
  // toggle — those changes are streamed in via postMessage.
  const [iframeUrl] = useState(() => buildUrl(pagePath));
  const openUrl = buildUrl(pagePath);

  return (
    <main className="flex-1 min-h-0 relative bg-zinc-50 dark:bg-zinc-900">
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 h-7 rounded-md bg-clip-border ring ring-zinc-800/10 dark:ring-white/10 bg-white dark:bg-zinc-800 px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 shadow-xs shadow-black/20 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-50"
        title="Open in new tab"
      >
        Open
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3"
          aria-hidden="true"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" x2="21" y1="14" y2="3" />
        </svg>
      </a>
      <iframe ref={ref} src={iframeUrl} className="absolute inset-0 w-full h-full border-0" title="player demo" />
    </main>
  );
});

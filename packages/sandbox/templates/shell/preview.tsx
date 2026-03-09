import { forwardRef } from 'react';
import type { SourceId } from '../shared/sources';
import type { Skin } from '../types';

type PreviewProps = {
  pagePath: string;
  skin: Skin;
  source: SourceId;
};

export const Preview = forwardRef<HTMLIFrameElement, PreviewProps>(function Preview({ pagePath, skin, source }, ref) {
  const openUrl = `${pagePath}?skin=${encodeURIComponent(skin)}&source=${encodeURIComponent(source)}`;

  return (
    <main className="flex-1 min-h-0 relative bg-zinc-50">
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 h-7 rounded-md bg-clip-border ring ring-zinc-800/10 bg-white px-2.5 text-xs font-medium text-zinc-600 shadow-xs shadow-black/20 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
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
      <iframe ref={ref} src={pagePath} className="absolute inset-0 w-full h-full border-0" title="player demo" />
    </main>
  );
});

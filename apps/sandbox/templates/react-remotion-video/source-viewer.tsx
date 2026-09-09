// SPIKE: shows the source behind the running demo. Vite's `?raw` glob imports pull each template file in as a string
// on demand, Shiki highlights it lazily with a light/dark theme pair that follows the page's `color-scheme`, and a link
// opens the same file on GitHub at the branch the sandbox was served from.

/// <reference types="vite/client" />

import { useEffect, useState } from 'react';

const RAW_SOURCES = import.meta.glob<string>('./*.{ts,tsx}', { query: '?raw', import: 'default' });

const TEMPLATE_DIR = 'apps/sandbox/templates/react-remotion-video';
const REPO_BLOB_URL = 'https://github.com/videojs/v10/blob';

/** Files every demo shares; the demo's own composition file goes first. */
export const SHARED_FILES = ['remotion-adapter.ts', 'remotion-video.tsx', 'demos.ts'] as const;

type Highlighted = { file: string; html: string | null; code: string };

async function loadSource(file: string): Promise<Highlighted> {
  const load = RAW_SOURCES[`./${file}`];
  if (!load) return { file, html: null, code: `// ${file} is not part of this template.` };

  const code = await load();

  try {
    const { codeToHtml } = await import('shiki');
    const html = await codeToHtml(code, {
      lang: file.endsWith('.tsx') ? 'tsx' : 'ts',
      themes: { light: 'github-light', dark: 'github-dark' },
      // Shiki emits `light-dark()` colours, so the page's `color-scheme` picks the theme without extra CSS.
      defaultColor: 'light-dark()',
    });

    return { file, html, code };
  } catch {
    // Highlighting is a nicety; the raw source is the point.
    return { file, html: null, code };
  }
}

function githubUrl(file: string) {
  const ref =
    __SANDBOX_BRANCH__ === 'unknown' || __SANDBOX_BRANCH__ === 'HEAD' ? __SANDBOX_COMMIT__ : __SANDBOX_BRANCH__;

  return `${REPO_BLOB_URL}/${ref}/${TEMPLATE_DIR}/${file}`;
}

const TAB_CLASS = 'rounded-md px-2 py-1 text-sm hover:bg-neutral-200 dark:hover:bg-neutral-800';
const ACTIVE_TAB_CLASS = 'bg-neutral-900 text-white hover:bg-neutral-900 dark:bg-white dark:text-neutral-900';

export function SourceViewer({ files }: { files: readonly string[] }) {
  const [active, setActive] = useState(files[0] ?? '');
  const [source, setSource] = useState<Highlighted | null>(null);

  // A demo switch changes the first file; follow it.
  useEffect(() => {
    setActive(files[0] ?? '');
  }, [files]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    setSource(null);
    void loadSource(active).then((loaded) => {
      if (!cancelled) setSource(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  if (files.length === 0) return null;

  return (
    <details open className="w-full max-w-[56rem]">
      <summary className="cursor-pointer text-sm font-medium">Source</summary>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {files.map((file) => (
          <button
            key={file}
            type="button"
            className={`${TAB_CLASS} ${file === active ? ACTIVE_TAB_CLASS : ''}`}
            onClick={() => setActive(file)}
          >
            {file}
          </button>
        ))}
        <a
          className="ml-auto text-sm underline underline-offset-2"
          href={githubUrl(active)}
          target="_blank"
          rel="noreferrer"
        >
          Open on GitHub ↗
        </a>
      </div>
      <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg border border-neutral-200 text-[13px] leading-snug dark:border-neutral-800 [&_pre]:m-0 [&_pre]:p-4">
        {source === null ? (
          <pre className="p-4 text-neutral-500">Loading {active}…</pre>
        ) : source.html ? (
          // SAFETY: the HTML is Shiki's own output for a source file checked into this repository.
          <div dangerouslySetInnerHTML={{ __html: source.html }} />
        ) : (
          <pre>{source.code}</pre>
        )}
      </div>
    </details>
  );
}

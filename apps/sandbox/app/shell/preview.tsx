import { COMPARE_LAYOUTS, type CompareLayout, type ComparePanel } from '@app/compare';
import { LAYOUT_LABELS } from '@app/labels';
import type { MediaId } from '@app/media';
import type { CaptionsMode } from '@app/shared/captions';
import type { SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import type { ColorScheme, PreloadValue, TextDirection } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { type ReportInput, buildReport } from './report';

/** Everything the frames share; the panels carry what differs. */
export interface FrameParams {
  readonly media: MediaId;
  readonly source: SourceId;
  readonly autoplay: boolean;
  readonly muted: boolean;
  readonly loop: boolean;
  readonly preload: PreloadValue;
  readonly captions: CaptionsMode;
  readonly locale: SandboxLocaleTag;
  readonly accentColor: string;
  readonly width: number;
  readonly scheme: ColorScheme;
  readonly direction: TextDirection;
  /** Mirror playback between compare panels. */
  readonly mirror: boolean;
}

type PreviewProps = {
  panels: readonly ComparePanel[];
  layout: CompareLayout;
  onLayoutChange: (layout: CompareLayout) => void;
  onMirrorChange: (mirror: boolean) => void;
  /** The skin controls, shown at the start of the header. */
  controls: ReactNode;
  summary: string;
  /** Everything the report needs beyond the selection, gathered by the shell. */
  report: Omit<ReportInput, 'url' | 'userAgent' | 'viewport' | 'panels' | 'summary'>;
  params: FrameParams;
  onFrame: (id: string, frame: HTMLIFrameElement | null) => void;
  onFrameLoad: (id: string) => void;
};

function pagePath(panel: ComparePanel, media: MediaId): string {
  if (panel.platform === 'cdn') return '/cdn/';

  return `/${panel.platform}-${media}/`;
}

function buildUrl(panel: ComparePanel, params: FrameParams, bustCache = false): string {
  const query = new URLSearchParams({
    media: params.media,
    skin: panel.skin,
    styling: panel.styling,
    skins: panel.skins,
    source: params.source,
    autoplay: params.autoplay ? '1' : '0',
    muted: params.muted ? '1' : '0',
    loop: params.loop ? '1' : '0',
    preload: params.preload,
    locale: params.locale,
    width: String(params.width),
    scheme: params.scheme,
    dir: params.direction,
  });

  if (params.captions !== 'none') query.set('captions', params.captions);

  if (params.accentColor) query.set('accent', params.accentColor);

  if (params.mirror) query.set('mirror', '1');

  if (bustCache) query.set('_', String(Date.now()));

  return `${pagePath(panel, params.media)}?${query}`;
}

const LAYOUT_CLASSES: Record<CompareLayout, string> = {
  row: 'grid-cols-2 grid-rows-1 overflow-hidden',
  column: 'grid-cols-1 auto-rows-[40rem] overflow-y-auto',
  auto: 'grid-cols-1 auto-rows-[40rem] overflow-y-auto @5xl:grid-cols-2 @5xl:grid-rows-1 @5xl:auto-rows-auto @5xl:overflow-hidden',
};

/**
 * The preview area: the skin controls and the preview actions, then one frame, or two framed panels laid out by
 * `layout`.
 */
export function Preview({
  panels,
  layout,
  onLayoutChange,
  onMirrorChange,
  controls,
  summary,
  report,
  params,
  onFrame,
  onFrameLoad,
}: PreviewProps) {
  const comparing = panels.length > 1;
  const single = panels[0];
  const buildPreviewReport = () =>
    buildReport({
      ...report,
      url: location.href,
      summary,
      panels: comparing ? panels.map((panel) => ({ label: panel.label, url: buildUrl(panel, params) })) : [],
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight, scale: devicePixelRatio },
    });

  return (
    <main className="@container flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-zinc-200 bg-white px-4 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
        {controls}
        {/* The selection in words stays in the tree for assistive technology and tests; the controls say it visually. */}
        <p className="sr-only" data-testid="selection-summary">
          {summary}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {comparing ? (
            <>
              <MirrorToggle value={params.mirror} onChange={onMirrorChange} />
              <LayoutToggle value={layout} onChange={onLayoutChange} />
            </>
          ) : (
            single && <OpenLink href={buildUrl(single, params)} />
          )}
          <ReportButton build={buildPreviewReport} errors={report.errors.length} />
        </div>
      </div>
      <div className={comparing ? `grid min-h-0 flex-1 gap-3 p-3 ${LAYOUT_CLASSES[layout]}` : 'flex min-h-0 flex-1'}>
        {panels.map((panel) => (
          <PreviewPanel
            key={`${panel.id}:${pagePath(panel, params.media)}:${panel.styling}:${panel.skins}`}
            panel={panel}
            params={params}
            comparing={comparing}
            onFrame={onFrame}
            onFrameLoad={onFrameLoad}
          />
        ))}
      </div>
    </main>
  );
}

type PreviewPanelProps = {
  panel: ComparePanel;
  params: FrameParams;
  comparing: boolean;
  onFrame: (id: string, frame: HTMLIFrameElement | null) => void;
  onFrameLoad: (id: string) => void;
};

function PreviewPanel({ panel, params, comparing, onFrame, onFrameLoad }: PreviewPanelProps) {
  const reloadOnLocale = panel.platform === 'cdn';

  // Capture the initial query so the iframe doesn't reload when autoplay/muted
  // toggle — those changes are streamed in via postMessage.
  const [iframeUrl, setIframeUrl] = useState(() => buildUrl(panel, params));
  const previousLocaleRef = useRef(params.locale);

  // keep iframe `src` locale in sync; other toggles use postMessage.
  // oxlint-disable-next-line react/exhaustive-deps
  useEffect(() => {
    if (previousLocaleRef.current === params.locale) return;

    previousLocaleRef.current = params.locale;
    setIframeUrl(buildUrl(panel, params, reloadOnLocale));
  }, [params.locale, reloadOnLocale]);

  return (
    <section
      data-panel={panel.id}
      className={
        comparing
          ? 'flex min-h-0 flex-col overflow-hidden rounded-lg bg-white ring ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800'
          : 'relative flex min-h-0 flex-1 flex-col'
      }
    >
      {comparing && (
        <header className="flex h-8 shrink-0 items-center justify-between px-3 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <span>{panel.label}</span>
          <OpenLink href={buildUrl(panel, params)} />
        </header>
      )}
      <iframe
        ref={(frame) => onFrame(panel.id, frame)}
        data-panel={panel.id}
        src={iframeUrl}
        onLoad={() => onFrameLoad(panel.id)}
        className="min-h-0 w-full flex-1 border-0"
        title={comparing ? `player demo (${panel.label})` : 'player demo'}
      />
    </section>
  );
}

function OpenLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-white bg-clip-border px-2.5 text-xs font-medium text-zinc-600 shadow-xs ring shadow-black/20 ring-zinc-800/10 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
  );
}

const CHROME_BUTTON =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-white bg-clip-border px-2.5 text-xs font-medium text-zinc-600 shadow-xs ring shadow-black/20 ring-zinc-800/10 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-zinc-800 dark:hover:text-zinc-50';

/**
 * Copies a markdown report for bug reports and shows it in a dialog, so it can be read or selected when the clipboard
 * is unavailable. The badge counts the errors the frames relayed.
 */
function ReportButton({ build, errors }: { build: () => string; errors: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [report, setReport] = useState('');
  const [copied, setCopied] = useState(false);

  const open = async () => {
    const text = build();

    setReport(text);
    setCopied(
      await navigator.clipboard?.writeText(text).then(
        () => true,
        () => false
      )
    );
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button type="button" onClick={() => void open()} className={CHROME_BUTTON}>
        Report
        {errors > 0 && (
          <span
            className="rounded-full bg-red-600 px-1.5 text-[10px] leading-4 text-white"
            aria-label={`${errors} errors`}
          >
            {errors}
          </span>
        )}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Preview report"
        className="m-auto w-[min(48rem,90vw)] rounded-lg border border-zinc-200 bg-white p-4 text-zinc-950 shadow-lg backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{copied ? 'Copied to the clipboard.' : 'Select and copy the report.'}</p>
          <button type="button" onClick={() => dialogRef.current?.close()} className={CHROME_BUTTON}>
            Close
          </button>
        </div>
        <textarea
          readOnly
          value={report}
          aria-label="Report markdown"
          rows={12}
          className="w-full resize-y rounded-md border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        />
      </dialog>
    </>
  );
}

/** Play, pause, seek, volume, rate, and captions in one panel reach the other. */
function MirrorToggle({ value, onChange }: { value: boolean; onChange: (mirror: boolean) => void }) {
  const id = useId();

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 cursor-pointer rounded border-zinc-300 accent-zinc-950 dark:border-zinc-700 dark:accent-zinc-50"
      />
      <label htmlFor={id} className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Mirror playback
      </label>
    </div>
  );
}

/** Side by side, stacked, or whichever fits: the panels' arrangement while comparing. */
function LayoutToggle({ value, onChange }: { value: CompareLayout; onChange: (layout: CompareLayout) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Compare layout"
      className="flex shrink-0 gap-0.5 rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800"
    >
      {COMPARE_LAYOUTS.map((layout) => (
        <button
          key={layout}
          type="button"
          role="radio"
          aria-checked={layout === value}
          onClick={() => onChange(layout)}
          className="rounded px-2 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-950 aria-checked:bg-white aria-checked:text-zinc-950 aria-checked:shadow-xs dark:text-zinc-300 dark:hover:text-zinc-50 dark:aria-checked:bg-zinc-950 dark:aria-checked:text-zinc-50"
        >
          {LAYOUT_LABELS[layout]}
        </button>
      ))}
    </div>
  );
}

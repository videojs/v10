import '@app/styles.css';
import type { PlayerStyleTheme } from './config';

/**
 * A two-frame comparison for one ported theme, in the shape the shell's Compare uses: one axis differs, everything else
 * is shared, and each panel is its own frame.
 *
 * Here the axis is the port itself — the theme rebuilt on Video.js 10 against the published media-chrome original. That
 * axis cannot live in the shell's Compare, whose panels all differ on a shell-owned selection.
 */

const LAYOUTS = ['auto', 'row', 'column'] as const;

type Layout = (typeof LAYOUTS)[number];

const LAYOUT_CLASSES: Record<Layout, string> = {
  auto: 'flex flex-col xl:flex-row',
  row: 'flex flex-row',
  column: 'flex flex-col',
};

function readLayout(): Layout {
  const value = new URLSearchParams(location.search).get('layout');

  return LAYOUTS.find((layout) => layout === value) ?? 'auto';
}

function readMirror(): boolean {
  return new URLSearchParams(location.search).get('mirror') === '1';
}

/** Keep the view in the URL, so a link reproduces it — the same contract the shell's previews have. */
function writeUrl(layout: Layout, mirror: boolean): void {
  const params = new URLSearchParams(location.search);

  if (layout === 'auto') params.delete('layout');
  else params.set('layout', layout);

  if (mirror) params.set('mirror', '1');
  else params.delete('mirror');

  const query = params.toString();

  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

/** Panels share every selection the page carries; only `panel` and the shell's own view state differ. */
function frameUrl(id: string, mirror: boolean): string {
  const params = new URLSearchParams(location.search);

  params.delete('layout');
  params.set('panel', id);

  if (mirror) params.set('mirror', '1');
  else params.delete('mirror');

  return `./?${params}`;
}

export function mountCompare(theme: PlayerStyleTheme): void {
  const panels = [
    { id: 'videojs', label: 'Video.js 10', hint: 'ported · @videojs/html' },
    { id: 'media-chrome', label: 'media-chrome', hint: `original · @player.style/${theme.name} ${theme.version}` },
  ] as const;

  const root = document.getElementById('root');
  if (!root) throw new Error('The sandbox page has no #root element.');

  let layout = readLayout();
  let mirror = readMirror();

  root.className = 'flex min-h-screen flex-col';
  root.innerHTML = `
    <header class="border-border bg-background flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-4 py-1.5">
      <h1 class="text-sm font-medium">${theme.label} — port vs original</h1>
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground text-xs">Layout</span>
        <div role="group" aria-label="Layout" class="flex gap-1" data-layout-group></div>
      </div>
      <label class="flex items-center gap-1.5 text-xs">
        <input type="checkbox" data-mirror ${mirror ? 'checked' : ''} />
        Mirror playback
      </label>
      <a class="text-muted-foreground ml-auto text-xs underline" href="../">All themes</a>
    </header>
    <div class="bg-muted/40 min-h-0 flex-1 gap-px" data-panels></div>
  `;

  const panelsEl = root.querySelector<HTMLElement>('[data-panels]')!;
  const layoutGroup = root.querySelector<HTMLElement>('[data-layout-group]')!;
  const mirrorInput = root.querySelector<HTMLInputElement>('[data-mirror]')!;

  panelsEl.innerHTML = panels
    .map(
      ({ id, label, hint }) => `
        <section class="flex min-h-0 min-w-0 flex-1 flex-col">
          <div class="border-border bg-background flex items-baseline gap-2 border-b px-3 py-1.5">
            <span class="text-xs font-medium">${label}</span>
            <span class="text-muted-foreground truncate text-[11px]">${hint}</span>
            <a class="text-muted-foreground ml-auto text-[11px] underline" data-open="${id}" target="_blank" rel="noreferrer">Open</a>
          </div>
          <iframe title="${label}" data-frame="${id}" class="min-h-[320px] w-full flex-1 border-0"></iframe>
        </section>
      `
    )
    .join('');

  const frames = new Map(
    panels.map(({ id }) => [id, panelsEl.querySelector<HTMLIFrameElement>(`[data-frame="${id}"]`)!] as const)
  );

  function applyLayout(): void {
    panelsEl.className = `bg-muted/40 min-h-0 flex-1 gap-px ${LAYOUT_CLASSES[layout]}`;

    layoutGroup.replaceChildren(
      ...LAYOUTS.map((value) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = value;
        button.setAttribute('aria-pressed', String(value === layout));
        button.className = `rounded border px-1.5 py-0.5 text-xs capitalize ${
          value === layout ? 'border-foreground/30 bg-muted font-medium' : 'border-transparent text-muted-foreground'
        }`;
        button.addEventListener('click', () => {
          layout = value;
          writeUrl(layout, mirror);
          applyLayout();
        });

        return button;
      })
    );
  }

  /** Point every frame at its URL. Toggling the mirror reloads them, since the flag is read from the frame's URL. */
  function loadFrames(): void {
    for (const [id, frame] of frames) {
      const url = frameUrl(id, mirror);

      frame.src = url;
      panelsEl.querySelector<HTMLAnchorElement>(`[data-open="${id}"]`)!.href = url;
    }
  }

  mirrorInput.addEventListener('change', () => {
    mirror = mirrorInput.checked;
    writeUrl(layout, mirror);
    loadFrames();
  });

  // Relay one panel's playback state to the other, the way the shell relays between its own compare frames.
  window.addEventListener('message', (event: MessageEvent) => {
    if (!mirror || event.data?.type !== 'sandbox-mirror') return;

    for (const frame of frames.values()) {
      const target = frame.contentWindow;

      if (target && target !== event.source) target.postMessage({ type: 'mirror-apply', state: event.data.state }, '*');
    }
  });

  applyLayout();
  loadFrames();
}

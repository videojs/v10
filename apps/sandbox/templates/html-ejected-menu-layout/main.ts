// Ejected HTML menu layout sandbox with Tailwind browser CDN CSS.
// http://localhost:5173/html-ejected-menu-layout/
import '@videojs/html/icons/element';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/ui';

interface LayoutCall {
  target: 'menu' | 'root view' | 'submenu view' | 'other';
  time: number;
  duration: number;
}

const SETTLE_TIME = 700;

const root = document.getElementById('root')!;
const panelCount = Number(new URLSearchParams(location.search).get('panels'));
const PANEL_COUNT = Number.isInteger(panelCount) && panelCount > 0 && panelCount <= 13 ? panelCount : 13;
const pageContent = Array.from(
  { length: 24 },
  (_, index) => `
    <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <span class="inline-flex rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">${index + 1}</span>
        <button class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">Manage</button>
      </div>
      <h2 class="text-base font-semibold text-gray-900">Tailwind content card</h2>
      <p class="mt-1 text-sm leading-6 text-gray-600">Host-page content to exercise selector matching during layout.</p>
    </article>
  `
).join('');

const panels = Array.from({ length: PANEL_COUNT }, (_, index) => {
  const panelNumber = index + 1;

  return {
    panelNumber,
    trigger: `
      <media-menu-item commandfor="settings-test-menu-${panelNumber}" class="media-menu__item media-menu__item--submenu">
        <media-text>Test panel ${panelNumber}</media-text>
        <span class="media-menu__hint">
          <media-icon name="chevron" class="media-icon media-menu__chevron"></media-icon>
        </span>
      </media-menu-item>
    `,
    content: `
      <media-menu id="settings-test-menu-${panelNumber}" class="media-menu__panel">
        <media-menu-back class="media-menu__back">
          <media-icon name="chevron" class="media-icon media-menu__chevron media-icon--flipped"></media-icon>
          <media-text>Test panel ${panelNumber}</media-text>
        </media-menu-back>
        <div class="media-menu__separator"></div>
        <div class="media-menu__group">
          <media-menu-item class="media-menu__item">Option one</media-menu-item>
          <media-menu-item class="media-menu__item">Option two</media-menu-item>
        </div>
      </media-menu>
    `,
  };
});

root.innerHTML = `
  <main class="mx-auto flex max-w-5xl flex-col gap-6">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">Ejected HTML menu layout</h1>
      <p class="max-w-3xl text-sm text-slate-300">
        The default video skin in light DOM with ${PANEL_COUNT} mounted settings submenus, Tailwind 4 browser CDN CSS,
        and host-page content. Use this to compare layout-read counts and duration before and after a menu change.
      </p>
    </header>

    <section class="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900 p-4 ring-1 ring-white/10">
      <button id="record-open" class="rounded bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400">
        Record next settings-menu open
      </button>
      <span id="status" class="text-sm text-slate-300">Close the settings menu, then start a recording.</span>
      <output id="result" class="ml-auto text-sm font-medium text-sky-300"></output>
    </section>

    <section class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      ${pageContent}
    </section>

    <section class="mx-auto w-full max-w-3xl overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
      <video-player>
        <media-container class="media-default-skin media-default-skin--video block bg-black" style="aspect-ratio: 16 / 9">
          <video muted playsinline></video>
          <media-controls data-visible class="media-surface media-controls">
            <div class="media-button-group">
              <button id="settings-trigger" commandfor="settings-menu" class="media-button media-button--subtle media-button--icon media-button--settings !grid">
                <media-icon name="gear" class="media-icon media-icon--settings"></media-icon>
                <span class="media-sr-only">Settings</span>
              </button>
              <media-menu id="settings-menu" side="top" align="center" class="media-surface media-popover media-menu media-menu--settings">
                <media-menu-view class="media-menu__panel">
                  <div class="media-menu__group">${panels.map((panel) => panel.trigger).join('')}</div>
                </media-menu-view>
                ${panels.map((panel) => panel.content).join('')}
              </media-menu>
            </div>
          </media-controls>
        </media-container>
      </video-player>
    </section>
  </main>
`;

const settingsMenu = document.getElementById('settings-menu')!;

const recordButton = document.getElementById('record-open')!;
const result = document.getElementById('result')!;
const status = document.getElementById('status')!;
const settingsTrigger = document.getElementById('settings-trigger')!;
const calls: LayoutCall[] = [];
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
let recording = false;

function getTarget(element: Element): LayoutCall['target'] {
  if (element === settingsMenu) return 'menu';
  if (element.matches('[data-menu-root-view]')) return 'root view';
  if (element.matches('[data-menu-view]')) return 'submenu view';
  return 'other';
}

function getSummary(): Record<LayoutCall['target'], number> {
  return {
    menu: calls.filter((call) => call.target === 'menu').length,
    'root view': calls.filter((call) => call.target === 'root view').length,
    'submenu view': calls.filter((call) => call.target === 'submenu view').length,
    other: calls.filter((call) => call.target === 'other').length,
  };
}

function getDuration(): number {
  return calls.reduce((duration, call) => duration + call.duration, 0);
}

Element.prototype.getBoundingClientRect = function (...args): DOMRect {
  const track = recording && settingsMenu.contains(this);
  const time = track ? performance.now() : 0;
  const rect = originalGetBoundingClientRect.apply(this, args);

  if (track) {
    calls.push({
      target: getTarget(this),
      time,
      duration: performance.now() - time,
    });
  }

  return rect;
};

recordButton.addEventListener('click', () => {
  calls.length = 0;
  recording = true;
  result.textContent = '';
  status.textContent = 'Recording. Open the settings menu once.';
});

settingsTrigger.addEventListener('click', () => {
  if (!recording) return;

  window.setTimeout(() => {
    recording = false;
    const summary = getSummary();
    const total = Object.values(summary).reduce((count, value) => count + value, 0);

    result.textContent = `${total} reads · ${getDuration().toFixed(1)} ms · root ${summary['root view']} · submenu ${summary['submenu view']}`;
    status.textContent = `Recorded an open with ${settingsMenu.querySelectorAll(':scope > media-menu').length} mounted submenus.`;
  }, SETTLE_TIME);
});

Object.assign(window, {
  menuLayoutProbe: {
    calls,
    getSummary,
    start() {
      calls.length = 0;
      recording = true;
    },
    stop() {
      recording = false;
    },
  },
});

window.addEventListener(
  'pagehide',
  () => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  },
  { once: true }
);

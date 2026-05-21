// HTML Menu sandbox
// http://localhost:5173/html-menu/
import '@app/styles.css';

import '@videojs/html/ui/menu';
import { renderIcon } from '@videojs/icons/render/minimal';
import { button, icon, menu } from '@videojs/skins/minimal/tailwind/video.tailwind';
import { cn } from '@videojs/utils/style';

// ── Class constants ───────────────────────────────────────────────────────────

const demoRootClass = cn(
  'flex flex-col items-center gap-12 font-sans text-[0.8125rem] leading-normal subpixel-antialiased',
  '[--media-current-shadow-color:oklch(0_0_0/0.2)]',
  '[--media-icon-size:18px]',
  '[--media-popover-background-color:oklch(1_0_0/0.92)]',
  '[--media-popover-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-popover-border-color:oklch(0_0_0/0.05)]',
  '[--media-popover-boundary-offset:0.75rem]',
  '[--media-popover-side-offset:0.375rem]',
  '[--media-popover-transition-duration:100ms]',
  '[--media-popover-transition-timing-function:ease-out]'
);

const demoCardClass =
  'bg-white ring-1 ring-black/10 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] text-zinc-950 shadow-sm';

const demoEyebrowClass = 'text-xs font-medium text-zinc-500 uppercase tracking-widest';

const demoMetaClass = 'text-[0.8125rem] text-zinc-500';

const menuContentClass = cn(menu.root, 'min-w-40 text-zinc-950');

const menuNavPopupClass = cn(menu.settings, 'text-zinc-950');

const menuLabelClass = 'block px-2.5 pb-1 pt-1.5 text-xs font-medium text-zinc-500 select-none';

const menuSeparatorClass = 'block h-px bg-zinc-950/10 mx-1 my-1';

const menuItemClass = cn(menu.item, 'text-shadow-none');

const menuBackClass = cn(menu.back, 'text-shadow-none');

const triggerButtonClass = cn(
  button.base,
  button.subtle,
  'group h-9 gap-1.5 px-3.5 py-0 text-sm font-medium text-shadow-none'
);

const checkIcon = renderIcon('check', { class: icon });
const itemIndicator = `<media-menu-item-indicator force-mount class="${menu.indicator}">${checkIcon}</media-menu-item-indicator>`;
const chevronIcon = renderIcon('chevron', { class: cn(icon, menu.chevron) });
const backChevronIcon = renderIcon('chevron', { class: cn(icon, menu.chevron, '-scale-x-100') });
const triggerChevronIcon = renderIcon('chevron', {
  class: cn(icon, menu.chevron, 'rotate-90 transition-transform group-aria-expanded:-rotate-90'),
});

// ── Render ────────────────────────────────────────────────────────────────────

const root = document.getElementById('root')!;

root.innerHTML = `
  <div class="${demoRootClass}">

    <header class="text-center flex flex-col gap-1.5">
      <h1 class="text-2xl font-semibold tracking-tight">HTML Menu</h1>
      <p class="text-sm text-slate-500">Custom elements — <code>&lt;media-menu&gt;</code> and friends</p>
    </header>

    <div class="flex gap-4 flex-wrap justify-center">

      <!-- Radio group -->
      <div class="${demoCardClass}">
        <span class="${demoEyebrowClass}">Radio group</span>
        <button
          commandfor="quality-menu"
          class="${triggerButtonClass}"
        >
          Quality
          ${triggerChevronIcon}
        </button>
        <media-menu id="quality-menu" boundary="viewport" class="${menuContentClass}">
          <media-menu-label class="${menuLabelClass}">Resolution</media-menu-label>
          <media-menu-radio-group id="quality-group" value="auto" class="${menu.standaloneGroup}">
            <media-menu-radio-item value="auto" class="${menuItemClass}"><span>Auto</span>${itemIndicator}</media-menu-radio-item>
            <media-menu-radio-item value="1080p" class="${menuItemClass}"><span>1080p</span>${itemIndicator}</media-menu-radio-item>
            <media-menu-radio-item value="720p" class="${menuItemClass}"><span>720p</span>${itemIndicator}</media-menu-radio-item>
            <media-menu-radio-item value="480p" class="${menuItemClass}"><span>480p</span>${itemIndicator}</media-menu-radio-item>
            <media-menu-radio-item value="360p" disabled class="${menuItemClass}"><span>360p (unavailable)</span>${itemIndicator}</media-menu-radio-item>
          </media-menu-radio-group>
        </media-menu>
        <p class="${demoMetaClass}">Selected: <strong id="quality-output" class="text-zinc-950 font-medium">auto</strong></p>
      </div>

      <!-- Mixed items -->
      <div class="${demoCardClass}">
        <span class="${demoEyebrowClass}">Mixed items</span>
        <button
          commandfor="settings-menu"
          class="${triggerButtonClass}"
        >
          Settings
          ${triggerChevronIcon}
        </button>
        <media-menu id="settings-menu" boundary="viewport" class="${menuContentClass}">
          <media-menu-label class="${menuLabelClass}">Playback</media-menu-label>
          <div class="${menu.standaloneGroup}">
            <media-menu-checkbox-item id="loop-item" class="${menuItemClass}"><span>Loop</span>${itemIndicator}</media-menu-checkbox-item>
            <media-menu-checkbox-item id="autoplay-item" class="${menuItemClass}"><span>Autoplay</span>${itemIndicator}</media-menu-checkbox-item>
          </div>
          <media-menu-separator class="${menuSeparatorClass}"></media-menu-separator>
          <media-menu-item id="copy-item" class="${menuItemClass}"><span>Copy link</span></media-menu-item>
          <media-menu-item id="report-item" class="${menuItemClass}"><span>Report issue</span></media-menu-item>
        </media-menu>
        <p class="${demoMetaClass}">Loop: <strong id="loop-output" class="text-zinc-950 font-medium">off</strong></p>
      </div>

      <!-- Submenu navigation -->
      <div class="${demoCardClass}">
        <span class="${demoEyebrowClass}">Submenu</span>
        <button
          commandfor="nav-menu"
          class="${triggerButtonClass}"
        >
          Settings
          ${triggerChevronIcon}
        </button>

        <media-menu id="nav-menu" boundary="viewport" class="${menuNavPopupClass}">
          <!-- Root list view — slides left when a submenu is active. -->
          <media-menu-view id="nav-root-view" class="${menu.panel}">

            <!-- Quality submenu trigger -->
            <media-menu-item id="nav-quality-trigger" commandfor="nav-quality-sub" class="${menuItemClass}">
              <span>Quality</span>
              <span class="${menu.hint}">
                <span id="nav-quality-hint" class="${menu.hintLabel}">auto</span>
                ${chevronIcon}
              </span>
            </media-menu-item>

            <!-- Speed submenu trigger -->
            <media-menu-item id="nav-speed-trigger" commandfor="nav-speed-sub" class="${menuItemClass}">
              <span>Speed</span>
              <span class="${menu.hint}">
                <span id="nav-speed-hint" class="${menu.hintLabel}">Normal</span>
                ${chevronIcon}
              </span>
            </media-menu-item>

            <media-menu-separator class="${menuSeparatorClass}"></media-menu-separator>
            <media-menu-item id="nav-copy-item" class="${menuItemClass}"><span>Copy link</span></media-menu-item>

          </media-menu-view>

          <media-menu id="nav-quality-sub" class="${menu.panel}">
            <media-menu-back class="${menuBackClass}">
              ${backChevronIcon}
              Quality
            </media-menu-back>
            <media-menu-radio-group id="nav-quality-group" value="auto" class="${menu.group}">
              <media-menu-radio-item value="auto" class="${menuItemClass}"><span>Auto</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="1080p" class="${menuItemClass}"><span>1080p</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="720p" class="${menuItemClass}"><span>720p</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="480p" class="${menuItemClass}"><span>480p</span>${itemIndicator}</media-menu-radio-item>
            </media-menu-radio-group>
          </media-menu>

          <media-menu id="nav-speed-sub" class="${menu.panel}">
            <media-menu-back class="${menuBackClass}">
              ${backChevronIcon}
              Speed
            </media-menu-back>
            <media-menu-radio-group id="nav-speed-group" value="1" class="${menu.group}">
              <media-menu-radio-item value="0.5" class="${menuItemClass}"><span>0.5x</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="0.75" class="${menuItemClass}"><span>0.75x</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="1" class="${menuItemClass}"><span>Normal</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="1.25" class="${menuItemClass}"><span>1.25x</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="1.5" class="${menuItemClass}"><span>1.5x</span>${itemIndicator}</media-menu-radio-item>
              <media-menu-radio-item value="2" class="${menuItemClass}"><span>2x</span>${itemIndicator}</media-menu-radio-item>
            </media-menu-radio-group>
          </media-menu>
        </media-menu>

        <p class="${demoMetaClass}">
          Quality: <strong id="nav-quality-output" class="text-zinc-950 font-medium">auto</strong>
          &nbsp;·&nbsp;
          Speed: <strong id="nav-speed-output" class="text-zinc-950 font-medium">Normal</strong>
        </p>
      </div>

    </div>

  </div>
`;

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('quality-group')!.addEventListener('value-change', (e) => {
  const { value } = (e as CustomEvent).detail;
  (e.target as HTMLElement).setAttribute('value', value);
  document.getElementById('quality-output')!.textContent = value;
});

document.getElementById('loop-item')!.addEventListener('checked-change', (e) => {
  const { checked } = (e as CustomEvent).detail;
  (e.target as HTMLElement).toggleAttribute('checked', checked);
  document.getElementById('loop-output')!.textContent = checked ? 'on' : 'off';
});

document.getElementById('autoplay-item')!.addEventListener('checked-change', (e) => {
  const checked = (e as CustomEvent).detail.checked;
  (e.target as HTMLElement).toggleAttribute('checked', checked);
});

document.getElementById('copy-item')!.addEventListener('select', () => {
  console.log('copy link');
});

document.getElementById('report-item')!.addEventListener('select', () => {
  console.log('report issue');
});

document.getElementById('nav-quality-group')!.addEventListener('value-change', (event) => {
  const { value } = (event as CustomEvent).detail;
  (event.target as HTMLElement).setAttribute('value', value);
  document.getElementById('nav-quality-output')!.textContent = value;
  document.getElementById('nav-quality-hint')!.textContent = value;
});

document.getElementById('nav-speed-group')!.addEventListener('value-change', (event) => {
  const { value } = (event as CustomEvent).detail;
  (event.target as HTMLElement).setAttribute('value', value);
  const label = value === '1' ? 'Normal' : `${value}x`;
  document.getElementById('nav-speed-output')!.textContent = label;
  document.getElementById('nav-speed-hint')!.textContent = label;
});

document.getElementById('nav-copy-item')!.addEventListener('select', () => {
  console.log('nav: copy link');
});

// HTML Menu sandbox
// http://localhost:5173/html-menu/
import '@app/styles.css';

import '@videojs/html/ui/menu';

// ── Class constants ───────────────────────────────────────────────────────────

const menuContentSurfaceClass =
  'bg-white border-none ring-1 ring-black/10 shadow-sm rounded-md p-1 min-w-[10rem] overflow-hidden outline-none';

const menuNavSurfaceClass =
  'bg-white border-none ring-1 ring-black/10 shadow-sm rounded-md min-w-[10rem] overflow-hidden outline-none';

const menuContentPlacementClass = [
  'data-side=bottom:origin-top data-side=top:origin-bottom',
  'data-side=left:origin-right data-side=right:origin-left',
  'data-starting-style:opacity-0 data-starting-style:scale-95 data-starting-style:-translate-y-1 data-starting-style:blur-sm',
  'data-ending-style:opacity-0 data-ending-style:scale-95 data-ending-style:-translate-y-1 data-ending-style:blur-sm',
].join(' ');

const menuContentClass = [
  menuContentSurfaceClass,
  'transition-[opacity,scale,translate,filter] duration-150',
  menuContentPlacementClass,
].join(' ');

const menuLabelClass = 'block px-2 pt-1.5 pb-0.5 text-xs font-semibold text-slate-500 select-none';

const menuSeparatorClass = 'block h-px bg-slate-200 -mx-1 my-1';

const menuItemClass = [
  'relative flex items-center gap-2 rounded-[calc(0.375rem-2px)] px-2 py-1.5',
  'text-sm text-slate-900 cursor-default select-none outline-none transition-colors',
  'data-[highlighted]:bg-slate-100',
  'aria-disabled:opacity-50 aria-disabled:pointer-events-none',
].join(' ');

const radioItemClass = [menuItemClass, 'pl-8'].join(' ');
const checkboxItemClass = [menuItemClass, 'pl-8'].join(' ');

// Submenu trigger — same as a regular item but with space-between layout
const subMenuTriggerClass = [menuItemClass, 'justify-between'].join(' ');

const subMenuContentClass = [
  'absolute inset-0 z-10 bg-white rounded-[inherit] p-1 outline-none overflow-hidden translate-x-0',
  'transition-transform duration-300 ease-in-out will-change-transform',
  '[&[data-starting-style][data-direction=forward]]:translate-x-full',
  '[&[data-ending-style][data-direction=forward]]:-translate-x-full',
  '[&[data-starting-style][data-direction=back]]:-translate-x-full',
  '[&[data-ending-style][data-direction=back]]:translate-x-full',
].join(' ');

// Root and submenu views share the same viewport so they can slide over each other.
const rootViewClass = [
  'absolute inset-0 p-1 translate-x-0',
  'transition-transform duration-300 ease-in-out will-change-transform',
  'data-[menu-view-state=inactive]:-translate-x-full',
].join(' ');

const backButtonClass = [
  'flex items-center gap-1.5 w-full rounded-[calc(0.375rem-2px)] px-2 py-1.5 mb-0.5',
  'text-sm font-medium text-slate-500 cursor-default select-none outline-none transition-colors',
  'hover:bg-slate-100 hover:text-slate-900',
].join(' ');

const menuNavPopupClass = [
  'group relative',
  menuNavSurfaceClass,
  'w-(--media-menu-width) h-(--media-menu-height)',
  'transition-[opacity,scale,translate,filter,width,height] duration-300 ease-in-out',
  menuContentPlacementClass,
].join(' ');

// ── Render ────────────────────────────────────────────────────────────────────

const root = document.getElementById('root')!;

root.innerHTML = `
  <div class="flex flex-col items-center gap-12">

    <header class="text-center flex flex-col gap-1.5">
      <h1 class="text-2xl font-semibold tracking-tight">HTML Menu</h1>
      <p class="text-sm text-slate-500">Custom elements — <code>&lt;media-menu&gt;</code> and friends</p>
    </header>

    <div class="flex gap-4 flex-wrap justify-center">

      <!-- Radio group -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] shadow-[0_1px_3px_0_rgb(0_0_0/.05)]">
        <span class="text-xs font-medium text-slate-500 uppercase tracking-widest">Radio group</span>
        <button
          commandfor="quality-menu"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 border border-slate-200 rounded-md bg-white text-slate-900 text-sm font-medium cursor-pointer select-none shadow-[0_1px_2px_0_rgb(0_0_0/.04)] transition-colors hover:bg-slate-50"
        >
          Quality
          <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <media-menu id="quality-menu" class="${menuContentClass}">
          <media-menu-label class="${menuLabelClass}">Resolution</media-menu-label>
          <media-menu-radio-group id="quality-group" value="auto">
            <media-menu-radio-item value="auto"   class="${radioItemClass}">Auto</media-menu-radio-item>
            <media-menu-radio-item value="1080p"  class="${radioItemClass}">1080p</media-menu-radio-item>
            <media-menu-radio-item value="720p"   class="${radioItemClass}">720p</media-menu-radio-item>
            <media-menu-radio-item value="480p"   class="${radioItemClass}">480p</media-menu-radio-item>
            <media-menu-radio-item value="360p" disabled class="${radioItemClass}">360p (unavailable)</media-menu-radio-item>
          </media-menu-radio-group>
        </media-menu>
        <p class="text-[0.8125rem] text-slate-500">Selected: <strong id="quality-output" class="text-slate-900 font-medium">auto</strong></p>
      </div>

      <!-- Mixed items -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] shadow-[0_1px_3px_0_rgb(0_0_0/.05)]">
        <span class="text-xs font-medium text-slate-500 uppercase tracking-widest">Mixed items</span>
        <button
          commandfor="settings-menu"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 border border-slate-200 rounded-md bg-white text-slate-900 text-sm font-medium cursor-pointer select-none shadow-[0_1px_2px_0_rgb(0_0_0/.04)] transition-colors hover:bg-slate-50"
        >
          Settings
          <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <media-menu id="settings-menu" class="${menuContentClass}">
          <media-menu-label class="${menuLabelClass}">Playback</media-menu-label>
          <media-menu-checkbox-item id="loop-item"     class="${checkboxItemClass}">Loop</media-menu-checkbox-item>
          <media-menu-checkbox-item id="autoplay-item" class="${checkboxItemClass}">Autoplay</media-menu-checkbox-item>
          <media-menu-separator class="${menuSeparatorClass}"></media-menu-separator>
          <media-menu-item id="copy-item"   class="${menuItemClass}">Copy link</media-menu-item>
          <media-menu-item id="report-item" class="${menuItemClass}">Report issue</media-menu-item>
        </media-menu>
        <p class="text-[0.8125rem] text-slate-500">Loop: <strong id="loop-output" class="text-slate-900 font-medium">off</strong></p>
      </div>

      <!-- Submenu navigation -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] shadow-[0_1px_3px_0_rgb(0_0_0/.05)]">
        <span class="text-xs font-medium text-slate-500 uppercase tracking-widest">Submenu</span>
        <button
          commandfor="nav-menu"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 border border-slate-200 rounded-md bg-white text-slate-900 text-sm font-medium cursor-pointer select-none shadow-[0_1px_2px_0_rgb(0_0_0/.04)] transition-colors hover:bg-slate-50"
        >
          Settings
          <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <media-menu id="nav-menu" class="${menuNavPopupClass}">
          <!-- Root list view — slides left when a submenu is active. -->
          <media-menu-view id="nav-root-view" class="${rootViewClass}">

            <!-- Quality submenu trigger -->
            <media-menu-item id="nav-quality-trigger" commandfor="nav-quality-sub" class="${subMenuTriggerClass}">
              <span>Quality</span>
              <span class="flex items-center gap-1">
                <span id="nav-quality-hint" class="text-xs text-slate-400">auto</span>
                <svg class="w-3.5 h-3.5 text-slate-400 -mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
              </span>
            </media-menu-item>

            <!-- Speed submenu trigger -->
            <media-menu-item id="nav-speed-trigger" commandfor="nav-speed-sub" class="${subMenuTriggerClass}">
              <span>Speed</span>
              <span class="flex items-center gap-1">
                <span id="nav-speed-hint" class="text-xs text-slate-400">Normal</span>
                <svg class="w-3.5 h-3.5 text-slate-400 -mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
              </span>
            </media-menu-item>

            <media-menu-separator class="${menuSeparatorClass}"></media-menu-separator>
            <media-menu-item id="nav-copy-item" class="${menuItemClass}">Copy link</media-menu-item>

          </media-menu-view>

          <media-menu id="nav-quality-sub" class="${subMenuContentClass}">
            <media-menu-back class="${backButtonClass}">
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Quality
            </media-menu-back>
            <media-menu-radio-group id="nav-quality-group" value="auto">
              <media-menu-radio-item value="auto"  class="${radioItemClass}">Auto</media-menu-radio-item>
              <media-menu-radio-item value="1080p" class="${radioItemClass}">1080p</media-menu-radio-item>
              <media-menu-radio-item value="720p"  class="${radioItemClass}">720p</media-menu-radio-item>
              <media-menu-radio-item value="480p"  class="${radioItemClass}">480p</media-menu-radio-item>
            </media-menu-radio-group>
          </media-menu>

          <media-menu id="nav-speed-sub" class="${subMenuContentClass}">
            <media-menu-back class="${backButtonClass}">
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Speed
            </media-menu-back>
            <media-menu-radio-group id="nav-speed-group" value="1">
              <media-menu-radio-item value="0.5"  class="${radioItemClass}">0.5x</media-menu-radio-item>
              <media-menu-radio-item value="0.75" class="${radioItemClass}">0.75x</media-menu-radio-item>
              <media-menu-radio-item value="1"    class="${radioItemClass}">Normal</media-menu-radio-item>
              <media-menu-radio-item value="1.25" class="${radioItemClass}">1.25x</media-menu-radio-item>
              <media-menu-radio-item value="1.5"  class="${radioItemClass}">1.5x</media-menu-radio-item>
              <media-menu-radio-item value="2"    class="${radioItemClass}">2x</media-menu-radio-item>
            </media-menu-radio-group>
          </media-menu>
        </media-menu>

        <p class="text-[0.8125rem] text-slate-500">
          Quality: <strong id="nav-quality-output" class="text-slate-900 font-medium">auto</strong>
          &nbsp;·&nbsp;
          Speed: <strong id="nav-speed-output" class="text-slate-900 font-medium">Normal</strong>
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

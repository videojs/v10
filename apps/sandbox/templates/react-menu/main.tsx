import '@app/styles.css';
// React Menu sandbox
// http://localhost:5173/react-menu/

import { Menu } from '@videojs/react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

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

// ── Indicators ────────────────────────────────────────────────────────────────

function RadioDot() {
  return <span className="absolute left-[0.5625rem] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-current" />;
}

function Checkmark() {
  return (
    <span className="absolute left-[0.4375rem] top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3 h-3"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

// ── Shared trigger button ─────────────────────────────────────────────────────

function TriggerButton({ children }: { children: React.ReactNode }) {
  return (
    <Menu.Trigger className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-slate-200 rounded-md bg-white text-slate-900 text-sm font-medium cursor-pointer select-none shadow-[0_1px_2px_0_rgb(0_0_0/.04)] transition-colors hover:bg-slate-50">
      {children}
      <svg
        aria-hidden="true"
        className="w-3.5 h-3.5 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </Menu.Trigger>
  );
}

// ── Demo ──────────────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg
      aria-hidden="true"
      className="w-3.5 h-3.5 text-slate-400 -mr-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg
      aria-hidden="true"
      className="w-3.5 h-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function App() {
  const [quality, setQuality] = useState('auto');
  const [speed, setSpeed] = useState('1');
  const [loop, setLoop] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  return (
    <div className="flex flex-col items-center gap-12">
      <header className="text-center flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">React Menu</h1>
        <p className="text-sm text-slate-500">
          {'<Menu.Root>'} and friends from <code>@videojs/react</code>
        </p>
      </header>

      <div className="flex gap-4 flex-wrap justify-center">
        {/* Radio group */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] shadow-[0_1px_3px_0_rgb(0_0_0/.05)]">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Radio group</span>
          <Menu.Root>
            <TriggerButton>Quality</TriggerButton>
            <Menu.Content className={menuContentClass}>
              <Menu.Label className={menuLabelClass}>Resolution</Menu.Label>
              <Menu.RadioGroup value={quality} onValueChange={setQuality}>
                {['auto', '1080p', '720p', '480p'].map((value) => (
                  <Menu.RadioItem key={value} value={value} className={radioItemClass}>
                    {quality === value && <RadioDot />}
                    {value}
                  </Menu.RadioItem>
                ))}
                <Menu.RadioItem value="360p" disabled className={radioItemClass}>
                  360p (unavailable)
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu.Root>
          <p className="text-[0.8125rem] text-slate-500">
            Selected: <strong className="text-slate-900 font-medium">{quality}</strong>
          </p>
        </div>

        {/* Mixed items */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] shadow-[0_1px_3px_0_rgb(0_0_0/.05)]">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Mixed items</span>
          <Menu.Root>
            <TriggerButton>Settings</TriggerButton>
            <Menu.Content className={menuContentClass}>
              <Menu.Label className={menuLabelClass}>Playback</Menu.Label>
              <Menu.CheckboxItem checked={loop} onCheckedChange={setLoop} className={checkboxItemClass}>
                {loop && <Checkmark />}
                Loop
              </Menu.CheckboxItem>
              <Menu.CheckboxItem checked={autoplay} onCheckedChange={setAutoplay} className={checkboxItemClass}>
                {autoplay && <Checkmark />}
                Autoplay
              </Menu.CheckboxItem>
              <Menu.Separator className={menuSeparatorClass} />
              <Menu.Item onSelect={() => console.log('copy link')} className={menuItemClass}>
                Copy link
              </Menu.Item>
              <Menu.Item onSelect={() => console.log('report issue')} className={menuItemClass}>
                Report issue
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
          <p className="text-[0.8125rem] text-slate-500">
            Loop: <strong className="text-slate-900 font-medium">{loop ? 'on' : 'off'}</strong>
          </p>
        </div>

        {/* Submenu navigation */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start gap-3.5 min-w-[200px] shadow-[0_1px_3px_0_rgb(0_0_0/.05)]">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Submenu</span>
          <Menu.Root>
            <TriggerButton>Settings</TriggerButton>
            <Menu.Content className={menuNavPopupClass}>
              <Menu.View className={rootViewClass}>
                {/* Quality submenu */}
                <Menu.Root>
                  <Menu.Trigger className={subMenuTriggerClass}>
                    <span>Quality</span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{quality}</span>
                      <ChevronRight />
                    </span>
                  </Menu.Trigger>
                  <Menu.Content className={subMenuContentClass}>
                    <Menu.Back className={backButtonClass}>
                      <ChevronLeft />
                      Quality
                    </Menu.Back>
                    <Menu.RadioGroup value={quality} onValueChange={setQuality}>
                      {['auto', '1080p', '720p', '480p'].map((v) => (
                        <Menu.RadioItem key={v} value={v} className={radioItemClass}>
                          {quality === v && <RadioDot />}
                          {v}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Content>
                </Menu.Root>

                {/* Speed submenu */}
                <Menu.Root>
                  <Menu.Trigger className={subMenuTriggerClass}>
                    <span>Speed</span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{speed === '1' ? 'Normal' : `${speed}x`}</span>
                      <ChevronRight />
                    </span>
                  </Menu.Trigger>
                  <Menu.Content className={subMenuContentClass}>
                    <Menu.Back className={backButtonClass}>
                      <ChevronLeft />
                      Speed
                    </Menu.Back>
                    <Menu.RadioGroup value={speed} onValueChange={setSpeed}>
                      {[
                        { value: '0.5', label: '0.5x' },
                        { value: '0.75', label: '0.75x' },
                        { value: '1', label: 'Normal' },
                        { value: '1.25', label: '1.25x' },
                        { value: '1.5', label: '1.5x' },
                        { value: '2', label: '2x' },
                      ].map(({ value, label }) => (
                        <Menu.RadioItem key={value} value={value} className={radioItemClass}>
                          {speed === value && <RadioDot />}
                          {label}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Content>
                </Menu.Root>

                <Menu.Separator className={menuSeparatorClass} />
                <Menu.Item onSelect={() => console.log('copy link')} className={menuItemClass}>
                  Copy link
                </Menu.Item>
              </Menu.View>
            </Menu.Content>
          </Menu.Root>
          <p className="text-[0.8125rem] text-slate-500">
            Quality: <strong className="text-slate-900 font-medium">{quality}</strong>
            {' · '}
            Speed: <strong className="text-slate-900 font-medium">{speed === '1' ? 'Normal' : `${speed}x`}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

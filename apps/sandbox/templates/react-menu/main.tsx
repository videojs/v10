import '@app/styles.css';
// React Menu sandbox
// http://localhost:5173/react-menu/

import { CheckIcon, ChevronIcon } from '@videojs/icons/react/minimal';
import { Menu } from '@videojs/react';
import { button, icon, menu, popup } from '@videojs/skins/minimal/tailwind/video.tailwind';
import { cn } from '@videojs/utils/style';
import { type ReactNode, useState } from 'react';
import { createRoot } from 'react-dom/client';

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

const menuContentClass = cn(popup.popover, menu.root, 'min-w-40 text-zinc-950');

const menuNavPopupClass = cn(popup.popover, menu.root, menu.settings, 'text-zinc-950');

const menuLabelClass = 'block px-2.5 pb-1 pt-1.5 text-xs font-medium text-zinc-500 select-none';

const menuSeparatorClass = 'block h-px bg-zinc-950/10 mx-1 my-1';

const menuItemClass = cn(menu.item, 'text-shadow-none');

const menuBackClass = cn(menu.back, 'text-shadow-none');

const triggerButtonClass = cn(
  button.base,
  button.subtle,
  'group h-9 gap-1.5 px-3.5 py-0 text-sm font-medium text-shadow-none'
);

function ItemCheck({ checked }: { checked: boolean }) {
  return (
    <Menu.ItemIndicator checked={checked} forceMount className={menu.indicator}>
      <CheckIcon className={icon} />
    </Menu.ItemIndicator>
  );
}

// ── Shared trigger button ─────────────────────────────────────────────────────

function TriggerButton({ children }: { children: ReactNode }) {
  return (
    <Menu.Trigger className={triggerButtonClass}>
      {children}
      <ChevronIcon
        className={cn(icon, menu.chevron, 'rotate-90 transition-transform group-aria-expanded:-rotate-90')}
      />
    </Menu.Trigger>
  );
}

// ── Demo ──────────────────────────────────────────────────────────────────────

function ChevronRight() {
  return <ChevronIcon className={cn(icon, menu.chevron)} />;
}

function ChevronLeft() {
  return <ChevronIcon className={cn(icon, menu.chevron, '-scale-x-100')} />;
}

function App() {
  const [quality, setQuality] = useState('auto');
  const [speed, setSpeed] = useState('1');
  const [loop, setLoop] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  return (
    <div className={demoRootClass}>
      <header className="text-center flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">React Menu</h1>
        <p className="text-sm text-slate-500">
          {'<Menu.Root>'} and friends from <code>@videojs/react</code>
        </p>
      </header>

      <div className="flex gap-4 flex-wrap justify-center">
        {/* Radio group */}
        <div className={demoCardClass}>
          <span className={demoEyebrowClass}>Radio group</span>
          <Menu.Root boundary="viewport">
            <TriggerButton>Quality</TriggerButton>
            <Menu.Content className={menuContentClass}>
              <Menu.Label className={menuLabelClass}>Resolution</Menu.Label>
              <Menu.RadioGroup className={menu.group} value={quality} onValueChange={setQuality}>
                {['auto', '1080p', '720p', '480p'].map((value) => (
                  <Menu.RadioItem key={value} value={value} className={menuItemClass}>
                    <span>{value}</span>
                    <ItemCheck checked={quality === value} />
                  </Menu.RadioItem>
                ))}
                <Menu.RadioItem value="360p" disabled className={menuItemClass}>
                  <span>360p (unavailable)</span>
                  <ItemCheck checked={quality === '360p'} />
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu.Root>
          <p className={demoMetaClass}>
            Selected: <strong className="text-zinc-950 font-medium">{quality}</strong>
          </p>
        </div>

        {/* Mixed items */}
        <div className={demoCardClass}>
          <span className={demoEyebrowClass}>Mixed items</span>
          <Menu.Root boundary="viewport">
            <TriggerButton>Settings</TriggerButton>
            <Menu.Content className={menuContentClass}>
              <Menu.Label className={menuLabelClass}>Playback</Menu.Label>
              <div className={menu.group}>
                <Menu.CheckboxItem checked={loop} onCheckedChange={setLoop} className={menuItemClass}>
                  <span>Loop</span>
                  <ItemCheck checked={loop} />
                </Menu.CheckboxItem>
                <Menu.CheckboxItem checked={autoplay} onCheckedChange={setAutoplay} className={menuItemClass}>
                  <span>Autoplay</span>
                  <ItemCheck checked={autoplay} />
                </Menu.CheckboxItem>
              </div>
              <Menu.Separator className={menuSeparatorClass} />
              <Menu.Item onSelect={() => console.log('copy link')} className={menuItemClass}>
                <span>Copy link</span>
              </Menu.Item>
              <Menu.Item onSelect={() => console.log('report issue')} className={menuItemClass}>
                <span>Report issue</span>
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
          <p className={demoMetaClass}>
            Loop: <strong className="text-zinc-950 font-medium">{loop ? 'on' : 'off'}</strong>
          </p>
        </div>

        {/* Submenu navigation */}
        <div className={demoCardClass}>
          <span className={demoEyebrowClass}>Submenu</span>
          <Menu.Root boundary="viewport">
            <TriggerButton>Settings</TriggerButton>
            <Menu.Content className={menuNavPopupClass}>
              <Menu.View className={menu.panel}>
                {/* Quality submenu */}
                <Menu.Root>
                  <Menu.Trigger className={menuItemClass}>
                    <span>Quality</span>
                    <span className={menu.hint}>
                      <span className={menu.hintLabel}>{quality}</span>
                      <ChevronRight />
                    </span>
                  </Menu.Trigger>
                  <Menu.Content className={menu.panel}>
                    <Menu.Back className={menuBackClass}>
                      <ChevronLeft />
                      Quality
                    </Menu.Back>
                    <Menu.RadioGroup className={menu.group} value={quality} onValueChange={setQuality}>
                      {['auto', '1080p', '720p', '480p'].map((v) => (
                        <Menu.RadioItem key={v} value={v} className={menuItemClass}>
                          <span>{v}</span>
                          <ItemCheck checked={quality === v} />
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Content>
                </Menu.Root>

                {/* Speed submenu */}
                <Menu.Root>
                  <Menu.Trigger className={menuItemClass}>
                    <span>Speed</span>
                    <span className={menu.hint}>
                      <span className={menu.hintLabel}>{speed === '1' ? 'Normal' : `${speed}x`}</span>
                      <ChevronRight />
                    </span>
                  </Menu.Trigger>
                  <Menu.Content className={menu.panel}>
                    <Menu.Back className={menuBackClass}>
                      <ChevronLeft />
                      Speed
                    </Menu.Back>
                    <Menu.RadioGroup className={menu.group} value={speed} onValueChange={setSpeed}>
                      {[
                        { value: '0.5', label: '0.5x' },
                        { value: '0.75', label: '0.75x' },
                        { value: '1', label: 'Normal' },
                        { value: '1.25', label: '1.25x' },
                        { value: '1.5', label: '1.5x' },
                        { value: '2', label: '2x' },
                      ].map(({ value, label }) => (
                        <Menu.RadioItem key={value} value={value} className={menuItemClass}>
                          <span>{label}</span>
                          <ItemCheck checked={speed === value} />
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Content>
                </Menu.Root>

                <Menu.Separator className={menuSeparatorClass} />
                <Menu.Item onSelect={() => console.log('copy link')} className={menuItemClass}>
                  <span>Copy link</span>
                </Menu.Item>
              </Menu.View>
            </Menu.Content>
          </Menu.Root>
          <p className={demoMetaClass}>
            Quality: <strong className="text-zinc-950 font-medium">{quality}</strong>
            {' · '}
            Speed: <strong className="text-zinc-950 font-medium">{speed === '1' ? 'Normal' : `${speed}x`}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

import clsx from 'clsx';
import { useEffect, useRef } from 'react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';
import { installMethod } from '@/stores/installation';
import { rendererSupportsCdn } from '@/utils/installation/cdn-code';
import { generateHTMLInstallCode } from '@/utils/installation/codegen';
import type { InstallMethod } from '@/utils/installation/types';

import HTMLCdnCodeBlock from './HTMLCdnCodeBlock';
import { useSelection } from './useSelection';

interface HTMLInstallTabsProps {
  /** Media subpaths that ship a CDN build, from the cdn-media manifest. */
  cdnMedia: string[];
}

export default function HTMLInstallTabs({ cdnMedia }: HTMLInstallTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const $renderer = useSelection('renderer');
  const $skin = useSelection('skin');
  const $useCase = useSelection('useCase');
  const $installMethod = useSelection('installMethod');

  const supportsCdn = rendererSupportsCdn($renderer, cdnMedia);
  const install = generateHTMLInstallCode({ renderer: $renderer, skin: $skin, useCase: $useCase }, cdnMedia);

  // Mirror the active install-method tab into the store so the usage code block
  // can react (e.g. CDN omits the TypeScript imports). Observing from the stable
  // wrapper rather than the tabs root means the observer survives the keyed
  // remount below, so it never needs to re-attach.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      const value = el.querySelector('[role="tab"][data-tab-active="true"]')?.getAttribute('data-value');

      if (value) installMethod.set(value as InstallMethod);
    });

    observer.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-tab-active'] });

    return () => observer.disconnect();
  }, []);

  // A renderer without a CDN build cannot keep `cdn` selected; everything else survives, including a method that
  // arrived through the URL before this island mounted.
  useEffect(() => {
    if (!supportsCdn && installMethod.get() === 'cdn') installMethod.set('npm');
  }, [supportsCdn]);

  // The store is the source of truth for the active tab: it is read from the URL on first subscription and the tab set
  // starts on its `initial` tab regardless, so drive the tabs from the store. Each Tab watches its own
  // `data-tab-active`, which is how a click updates it too, so this mirrors exactly what a click does.
  useEffect(() => {
    const tabs = ref.current?.querySelectorAll<HTMLElement>('[role="tab"]');
    const target = tabs && Array.from(tabs).find((tab) => tab.dataset.value === $installMethod);
    if (!target || target.dataset.tabActive === 'true') return;

    for (const tab of tabs) tab.setAttribute('data-tab-active', String(tab === target));
  }, [$installMethod, supportsCdn]);

  return (
    <div ref={ref}>
      {/* Remount the tab set when CDN availability changes so the active tab
          resets cleanly to its initial. Without this, flipping the npm tab's
          `initial` while the CDN tab mounts/unmounts can leave two tabs active
          at once and desync installMethod from the visible tab. */}
      <TabsRoot key={supportsCdn ? 'with-cdn' : 'without-cdn'}>
        <TabsList label="Installation">
          {supportsCdn && (
            <Tab value="cdn" initial>
              cdn
            </Tab>
          )}
          <Tab value="npm" initial={!supportsCdn}>
            npm
          </Tab>
          <Tab value="pnpm">pnpm</Tab>
          <Tab value="yarn">yarn</Tab>
          <Tab value="bun">bun</Tab>
        </TabsList>
        {supportsCdn && (
          <TabsPanel value="cdn" initial>
            <HTMLCdnCodeBlock cdnMedia={cdnMedia} />
          </TabsPanel>
        )}
        <TabsPanel value="npm" initial={!supportsCdn}>
          <ClientCode code={install.npm} lang="bash" />
        </TabsPanel>
        <TabsPanel value="pnpm">
          <ClientCode code={install.pnpm} lang="bash" />
        </TabsPanel>
        <TabsPanel value="yarn">
          <ClientCode code={install.yarn} lang="bash" />
        </TabsPanel>
        <TabsPanel value="bun">
          <ClientCode code={install.bun} lang="bash" />
        </TabsPanel>
      </TabsRoot>
      {!supportsCdn && (
        <p className={clsx(shared.p, shared.prose)}>
          This source type isn't available via CDN — install it with a package manager (npm, pnpm, yarn, or bun).
        </p>
      )}
    </div>
  );
}

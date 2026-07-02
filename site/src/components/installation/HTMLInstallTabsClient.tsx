import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';
import { installMethod, renderer } from '@/stores/installation';
import { rendererSupportsCdn } from '@/utils/installation/cdn-code';
import type { InstallMethod } from '@/utils/installation/types';
import HTMLCdnCodeBlock from './HTMLCdnCodeBlock';

interface HTMLInstallTabsProps {
  /** Media subpaths that ship a CDN build, from the cdn-media manifest. */
  cdnMedia: string[];
}

export default function HTMLInstallTabs({ cdnMedia }: HTMLInstallTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const $renderer = useStore(renderer);

  const supportsCdn = rendererSupportsCdn($renderer, cdnMedia);

  // Mirror the active install-method tab into the store so the usage code block
  // can react (e.g. CDN omits the JS imports). Observing from the stable
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

  // When CDN availability flips, the tab set remounts and resets to its initial
  // tab (cdn when available, else npm). That reset swaps in new DOM nodes rather
  // than toggling `data-tab-active` on existing ones, so the observer above
  // doesn't catch it — sync the store explicitly. Without this, a stale `cdn`
  // can survive onto a renderer with no CDN build (e.g. Vimeo), where the usage
  // block would then wrongly drop its required JS import lines.
  useEffect(() => {
    installMethod.set(supportsCdn ? 'cdn' : 'npm');
  }, [supportsCdn]);

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
          <ClientCode code="npm install @videojs/html" lang="bash" />
        </TabsPanel>
        <TabsPanel value="pnpm">
          <ClientCode code="pnpm add @videojs/html" lang="bash" />
        </TabsPanel>
        <TabsPanel value="yarn">
          <ClientCode code="yarn add @videojs/html" lang="bash" />
        </TabsPanel>
        <TabsPanel value="bun">
          <ClientCode code="bun add @videojs/html" lang="bash" />
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

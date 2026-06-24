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

  // When the selected renderer has no CDN build, the CDN tab is removed; make
  // sure the install method isn't left pointing at the now-missing option.
  useEffect(() => {
    if (!supportsCdn && installMethod.get() === 'cdn') {
      installMethod.set('npm');
    }
  }, [supportsCdn]);

  // Mirror the active install-method tab into the store so the usage code
  // block can react (e.g. CDN omits the JS imports). A single observer on the
  // tabs root with `subtree: true` catches `data-tab-active` flips on any tab,
  // including the CDN tab when it's added or removed as the renderer changes —
  // so it never needs to re-attach, and the dependency array stays honest.
  useEffect(() => {
    const root = ref.current?.querySelector('[data-tabs-root]');
    if (!root) return;

    const observer = new MutationObserver(() => {
      const value = root.querySelector('[role="tab"][data-tab-active="true"]')?.getAttribute('data-value');
      if (value) installMethod.set(value as InstallMethod);
    });

    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-tab-active'] });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <TabsRoot>
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
            <HTMLCdnCodeBlock />
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
        <p className={clsx(shared.p, shared.pMaxWidth)}>
          This source type isn't available via CDN — install it with a package manager (npm, pnpm, yarn, or bun).
        </p>
      )}
    </div>
  );
}

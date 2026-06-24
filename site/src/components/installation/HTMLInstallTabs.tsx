import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
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

  // Observe tab changes and sync to installMethod store. The effect body
  // doesn't read supportsCdn, but it must re-run when it changes: adding or
  // removing the CDN tab changes the rendered tab set, and the observer has to
  // re-attach to the current tabs (otherwise switching to/from a no-CDN
  // renderer leaves installMethod tracking stale tabs).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-attach observers when the tab set changes
  useEffect(() => {
    const root = ref.current?.querySelector('[data-tabs-root]');
    if (!root) return;

    const observer = new MutationObserver(() => {
      const activeTab = root.querySelector('[role="tab"][data-tab-active="true"]');
      if (activeTab) {
        const value = activeTab.getAttribute('data-value');
        if (value) {
          installMethod.set(value as InstallMethod);
        }
      }
    });

    const tabs = root.querySelectorAll('[role="tab"]');
    tabs.forEach((tab) => {
      observer.observe(tab, { attributes: true, attributeFilter: ['data-tab-active'] });
    });

    return () => observer.disconnect();
  }, [supportsCdn]);

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
        <p className="my-4 mx-auto max-w-3xl">
          This source type isn't available via CDN — install it with a package manager (npm, pnpm, yarn, or bun).
        </p>
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { InstallMethod } from '@/stores/installation';
import { installMethod } from '@/stores/installation';
import HTMLCdnCodeBlock from './HTMLCdnCodeBlock';

export default function HTMLInstallTabs() {
  const ref = useRef<HTMLDivElement>(null);

  // Observe tab changes and sync to installMethod store
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

    // Observe all tab elements for attribute changes
    const tabs = root.querySelectorAll('[role="tab"]');
    tabs.forEach((tab) => {
      observer.observe(tab, { attributes: true, attributeFilter: ['data-tab-active'] });
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <TabsRoot variant="docs">
        <TabsList label="Installation" variant="docs">
          <Tab value="cdn" initial variant="docs">
            cdns
          </Tab>
          <Tab value="npm" variant="docs">
            npm
          </Tab>
          <Tab value="pnpm" variant="docs">
            pnpm
          </Tab>
          <Tab value="yarn" variant="docs">
            yarn
          </Tab>
          <Tab value="bun" variant="docs">
            bun
          </Tab>
        </TabsList>
        <TabsPanel value="cdn" initial variant="docs">
          <HTMLCdnCodeBlock />
        </TabsPanel>
        <TabsPanel value="npm" variant="docs">
          <ClientCode code="npm install @videojs/html" lang="bash" />
        </TabsPanel>
        <TabsPanel value="pnpm" variant="docs">
          <ClientCode code="pnpm add @videojs/html" lang="bash" />
        </TabsPanel>
        <TabsPanel value="yarn" variant="docs">
          <ClientCode code="yarn add @videojs/html" lang="bash" />
        </TabsPanel>
        <TabsPanel value="bun" variant="docs">
          <ClientCode code="bun add @videojs/html" lang="bash" />
        </TabsPanel>
      </TabsRoot>
    </div>
  );
}

import { useEffect } from 'react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { installMethod } from '@/stores/installation';
import { generateHTMLInstallCode } from '@/utils/installation/codegen';

import { useSelection } from './useSelection';

export default function HTMLInstallTabs() {
  const $renderer = useSelection('renderer');
  const $skin = useSelection('skin');
  const $useCase = useSelection('useCase');
  const install = generateHTMLInstallCode({ renderer: $renderer, skin: $skin, useCase: $useCase }, []);

  useEffect(() => {
    if (installMethod.get() === 'cdn') installMethod.set('npm');
  }, []);

  return (
    <div>
      <TabsRoot>
        <TabsList label="Installation">
          <Tab value="npm" initial>
            npm
          </Tab>
          <Tab value="pnpm">pnpm</Tab>
          <Tab value="yarn">yarn</Tab>
          <Tab value="bun">bun</Tab>
        </TabsList>
        <TabsPanel value="npm" initial>
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
    </div>
  );
}

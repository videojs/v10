import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateReactInstallCode } from '@/utils/installation/codegen';

import { useSelection } from './useSelection';

export default function ReactInstallTabs() {
  const install = generateReactInstallCode({ renderer: useSelection('renderer') });

  return (
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
  );
}

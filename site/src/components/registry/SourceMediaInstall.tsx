import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateSourceMediaInstallCode } from '@/utils/installation/codegen';

import { useSelection } from '../installation/useSelection';

export default function SourceMediaInstall() {
  const install = generateSourceMediaInstallCode(useSelection('renderer'));
  if (!install) return <p>The skin already installed the player package. This media source needs no other package.</p>;

  return (
    <TabsRoot>
      <TabsList label="Package manager">
        <Tab value="npm" initial>
          npm
        </Tab>
        <Tab value="pnpm">pnpm</Tab>
        <Tab value="yarn">yarn</Tab>
        <Tab value="bun">bun</Tab>
      </TabsList>
      {(['npm', 'pnpm', 'yarn', 'bun'] as const).map((runner, index) => (
        <TabsPanel key={runner} value={runner} initial={index === 0}>
          <ClientCode code={install[runner]} lang="bash" />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}

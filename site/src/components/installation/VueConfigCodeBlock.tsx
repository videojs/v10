import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateVueCustomElementConfigCode } from '@/utils/installation/codegen';

import { useSelection } from './useSelection';

export default function VueConfigCodeBlock() {
  const code = generateVueCustomElementConfigCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
  });

  return (
    <TabsRoot>
      <TabsList label="Build tool">
        <Tab value="vite" initial>
          Vite
        </Tab>
        <Tab value="nuxt">Nuxt</Tab>
      </TabsList>
      <TabsPanel value="vite" initial>
        <ClientCode code={code['vite.config.ts']} lang="ts" />
      </TabsPanel>
      <TabsPanel value="nuxt">
        <ClientCode code={code['nuxt.config.ts']} lang="ts" />
      </TabsPanel>
    </TabsRoot>
  );
}

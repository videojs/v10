import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateVueUsageCode } from '@/utils/installation/codegen';

import { useSelection } from './useSelection';

export default function VueUsageCodeBlock() {
  const code = generateVueUsageCode({
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue usage">
        <Tab value="app" initial>
          App.vue
        </Tab>
      </TabsList>
      <TabsPanel value="app" initial>
        <ClientCode code={code['App.vue']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

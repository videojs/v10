import { generateVueUsageCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function VueUsageCodeBlock() {
  const project = installationProjectFiles('vue', useSelection('template'));
  const code = generateVueUsageCode({
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
    playerImport: project.playerImport,
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue usage">
        <Tab value="app" initial>
          {project.usage}
        </Tab>
      </TabsList>
      <TabsPanel value="app" initial>
        <ClientCode code={code['App.vue']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

import { generateVueUsageCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function VueUsageCodeBlock() {
  const template = useSelection('template');
  const useCase = useSelection('useCase');
  const project = installationProjectFiles('vue', template, useCase);
  const code = generateVueUsageCode({
    useCase,
    renderer: useSelection('renderer'),
    extensions: useSelection('extensions'),
    sourceUrl: useSelection('sourceUrl'),
    playerImport: project.playerImport,
  });
  const codeValue = template === 'astro' ? 'index.astro' : 'App.vue';

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue usage">
        <Tab value="app" initial>
          {project.usage}
        </Tab>
      </TabsList>
      <TabsPanel value="app" initial>
        <ClientCode code={code[codeValue]} lang={template === 'astro' ? 'astro' : 'html'} />
      </TabsPanel>
    </TabsRoot>
  );
}

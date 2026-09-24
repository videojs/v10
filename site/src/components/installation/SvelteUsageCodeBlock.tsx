import { generateSvelteUsageCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function SvelteUsageCodeBlock() {
  const template = useSelection('template');
  const project = installationProjectFiles('svelte', template);
  const codeValue = template === 'sveltekit' ? '+page.svelte' : 'App.svelte';
  const code = generateSvelteUsageCode({
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="App type">
        <Tab value="usage" initial>
          {project.usage}
        </Tab>
      </TabsList>
      <TabsPanel value="usage" initial>
        <ClientCode code={code[codeValue]} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

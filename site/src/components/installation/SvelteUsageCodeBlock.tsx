import { generateSvelteUsageCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function SvelteUsageCodeBlock() {
  const template = useSelection('template');
  const useCase = useSelection('useCase');
  const project = installationProjectFiles('svelte', template, useCase);
  const codeValue = template === 'astro' ? 'index.astro' : template === 'sveltekit' ? '+page.svelte' : 'App.svelte';
  const code = generateSvelteUsageCode({
    useCase,
    renderer: useSelection('renderer'),
    extensions: useSelection('extensions'),
    sourceUrl: useSelection('sourceUrl'),
    playerImport: project.playerImport,
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="App type">
        <Tab value="usage" initial>
          {project.usage}
        </Tab>
      </TabsList>
      <TabsPanel value="usage" initial>
        <ClientCode code={code[codeValue]} lang={template === 'astro' ? 'astro' : 'html'} />
      </TabsPanel>
    </TabsRoot>
  );
}

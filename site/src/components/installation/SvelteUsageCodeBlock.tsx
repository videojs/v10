import { generateSvelteUsageCode } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function SvelteUsageCodeBlock() {
  const code = generateSvelteUsageCode({
    useCase: useSelection('useCase'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="App type">
        <Tab value="sveltekit" initial>
          SvelteKit
        </Tab>
        <Tab value="svelte">Svelte</Tab>
      </TabsList>
      <TabsPanel value="sveltekit" initial>
        <ClientCode code={code['+page.svelte']} lang="html" />
      </TabsPanel>
      <TabsPanel value="svelte">
        <ClientCode code={code['App.svelte']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

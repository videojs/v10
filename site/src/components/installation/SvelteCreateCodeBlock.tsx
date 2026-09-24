import { generateSvelteCreateCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function SvelteCreateCodeBlock() {
  const project = installationProjectFiles('svelte', useSelection('template'));
  const code = generateSvelteCreateCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Svelte implementation">
        <Tab value="player" initial>
          {project.player}
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code['VideoPlayer.svelte']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

import { generateSvelteCreateCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function SvelteCreateCodeBlock() {
  const template = useSelection('template');
  const useCase = useSelection('useCase');
  const project = installationProjectFiles('svelte', template, useCase);
  const code = generateSvelteCreateCode({
    useCase,
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
    extensions: useSelection('extensions'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Svelte implementation">
        <Tab value="player" initial>
          {project.player}
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code.component} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

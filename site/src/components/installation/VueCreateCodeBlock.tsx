import { generateVueCreateCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function VueCreateCodeBlock() {
  const project = installationProjectFiles('vue', useSelection('template'));
  const code = generateVueCreateCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue implementation">
        <Tab value="player" initial>
          {project.player}
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code['MediaPlayer.vue']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

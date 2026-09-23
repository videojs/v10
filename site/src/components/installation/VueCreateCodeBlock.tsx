import { generateVueCreateCode } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function VueCreateCodeBlock() {
  const code = generateVueCreateCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue implementation">
        <Tab value="player" initial>
          components/VideoPlayer.vue
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code['VideoPlayer.vue']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateSourceReactCreateCode } from '@/utils/installation/codegen';

import { useSelection } from '../installation/useSelection';

export default function SourceReactPlayer() {
  const code = generateSourceReactCreateCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="player" initial>
          components/player/index.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code['MyPlayer.tsx']} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}

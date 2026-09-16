import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateReactCreateCode } from '@/utils/installation/codegen';

import { useSelection } from './useSelection';

export default function ReactCreateCodeBlock() {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('renderer');

  const result = generateReactCreateCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="react" initial>
          ./components/player/index.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={result['MyPlayer.tsx']} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}

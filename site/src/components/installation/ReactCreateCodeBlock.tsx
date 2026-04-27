import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { renderer, skin, useCase } from '@/stores/installation';
import { generateReactCreateCode } from '@/utils/installation/codegen';

export default function ReactCreateCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);

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

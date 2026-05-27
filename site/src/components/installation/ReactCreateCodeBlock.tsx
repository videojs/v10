import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { embedMethod, renderer, skin, useCase } from '@/stores/installation';
import { generateReactCreateCode } from '@/utils/installation/codegen';

export default function ReactCreateCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $embedMethod = useStore(embedMethod);

  const result = generateReactCreateCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    embedMethod: $embedMethod,
  });

  const hasSkinTsx = 'Skin.tsx' in result && !!result['Skin.tsx'];
  const hasSkinCss = 'skin.css' in result && !!result['skin.css'];

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="index" initial>
          ./components/player/index.tsx
        </Tab>
        {hasSkinTsx && <Tab value="skin-tsx">./components/player/Skin.tsx</Tab>}
        {hasSkinCss && <Tab value="skin-css">./components/player/skin.css</Tab>}
      </TabsList>
      <TabsPanel value="index" initial>
        <ClientCode code={result['MyPlayer.tsx']} lang="tsx" />
      </TabsPanel>
      {hasSkinTsx && (
        <TabsPanel value="skin-tsx">
          <ClientCode code={result['Skin.tsx']!} lang="tsx" />
        </TabsPanel>
      )}
      {hasSkinCss && (
        <TabsPanel value="skin-css">
          <ClientCode code={result['skin.css']!} lang="css" />
        </TabsPanel>
      )}
    </TabsRoot>
  );
}

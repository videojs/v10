import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { installMethod, renderer, skin, sourceUrl, useCase } from '@/stores/installation';
import { generateVueUsageCode } from '@/utils/installation/codegen';

/**
 * The player the HTML block generates, written as a Vue single-file component: the source becomes a prop, and the Vite
 * config registers exactly the custom-element tags this player renders.
 *
 * The components are highlighted as `html` rather than `vue`: the client highlighter only carries the grammars the docs
 * need, and the HTML grammar already highlights an SFC's `<script>` block as JavaScript and its template as markup.
 */
export default function VueUsageCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $installMethod = useStore(installMethod);
  const $sourceUrl = useStore(sourceUrl);

  const result = generateVueUsageCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: $installMethod,
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue implementation">
        <Tab value="component" initial>
          ./components/MyPlayer.vue
        </Tab>
        <Tab value="usage">./App.vue</Tab>
        <Tab value="config">./vite.config.ts</Tab>
      </TabsList>
      <TabsPanel value="component" initial>
        <ClientCode code={result.component} lang="html" />
      </TabsPanel>
      <TabsPanel value="usage">
        <ClientCode code={result.usage} lang="html" />
      </TabsPanel>
      <TabsPanel value="config">
        <ClientCode code={result.viteConfig} lang="ts" />
      </TabsPanel>
    </TabsRoot>
  );
}

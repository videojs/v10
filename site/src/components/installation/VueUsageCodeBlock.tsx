import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { installMethod, renderer, skin, sourceUrl, useCase } from '@/stores/installation';
import { generateVueUsageCode } from '@/utils/installation/codegen';

/**
 * The same player the HTML block generates, wrapped in a Vue single-file component.
 *
 * Highlighted as `html` rather than `vue`: the client highlighter only carries the grammars the docs need, and the HTML
 * grammar already highlights an SFC's `<script>` block as JavaScript and its template as markup.
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
        <Tab value="vue" initial>
          ./components/MyPlayer.vue
        </Tab>
      </TabsList>
      <TabsPanel value="vue" initial>
        <ClientCode code={result['MyPlayer.vue']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

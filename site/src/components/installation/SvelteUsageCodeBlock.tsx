import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { installMethod, renderer, skin, sourceUrl, useCase } from '@/stores/installation';
import { generateSvelteUsageCode } from '@/utils/installation/codegen';

/**
 * The same player the HTML block generates, wrapped in a Svelte component.
 *
 * Highlighted as `html` rather than `svelte`: the client highlighter only carries the grammars the docs need, and the
 * HTML grammar already highlights the component's `<script>` block as JavaScript and its markup as markup.
 */
export default function SvelteUsageCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $installMethod = useStore(installMethod);
  const $sourceUrl = useStore(sourceUrl);

  const result = generateSvelteUsageCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: $installMethod,
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Svelte implementation">
        <Tab value="svelte" initial>
          ./lib/MyPlayer.svelte
        </Tab>
      </TabsList>
      <TabsPanel value="svelte" initial>
        <ClientCode code={result['MyPlayer.svelte']} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

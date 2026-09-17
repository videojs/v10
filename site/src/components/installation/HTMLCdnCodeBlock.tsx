import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { generateCdnCode } from '@/utils/installation/cdn-code';

import { useSelection } from './useSelection';

interface HTMLCdnCodeBlockProps {
  /** Media subpaths that ship a CDN build, from the cdn-media manifest. */
  cdnMedia: string[];
}

export default function HTMLCdnCodeBlock({ cdnMedia }: HTMLCdnCodeBlockProps) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('renderer');

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="CDN scripts">
        <Tab value="html" initial>
          index.html
        </Tab>
      </TabsList>
      <TabsPanel value="html" initial>
        <ClientCode code={generateCdnCode($useCase, $skin, $renderer, cdnMedia)} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

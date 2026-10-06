import { CDN_MEDIA_SUBPATHS, generateCdnCode } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { VJS10_CDN_BASE } from '@/consts';

import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

function HTMLCdnCodeBlock() {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('media');
  const $extensions = useSelection('extensions');

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="CDN scripts">
        <Tab value="html" initial>
          index.html
        </Tab>
      </TabsList>
      <TabsPanel value="html" initial>
        <ClientCode
          code={generateCdnCode($useCase, $skin, $renderer, CDN_MEDIA_SUBPATHS, VJS10_CDN_BASE, $extensions)}
          lang="html"
        />
      </TabsPanel>
    </TabsRoot>
  );
}

export default withSelectionMarker(HTMLCdnCodeBlock);

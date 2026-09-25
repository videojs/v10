import { generateHTMLInstallCode } from '@videojs/installation';

import { VJS10_VERSION } from '@/consts';

import PackageManagerTabs from './PackageManagerTabs';
import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

function HTMLInstallTabs() {
  const $renderer = useSelection('renderer');
  const $extensions = useSelection('extensions');
  const $skin = useSelection('skin');
  const $useCase = useSelection('useCase');
  const install = generateHTMLInstallCode(
    { renderer: $renderer, extensions: $extensions, skin: $skin, useCase: $useCase },
    [],
    undefined,
    VJS10_VERSION
  );

  return <PackageManagerTabs commands={install} />;
}

export default withSelectionMarker(HTMLInstallTabs);

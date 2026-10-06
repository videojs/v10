import { generateReactInstallCode } from '@videojs/installation';

import { VJS10_VERSION } from '@/consts';

import PackageManagerTabs from './PackageManagerTabs';
import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

function ReactInstallTabs() {
  const install = generateReactInstallCode(
    { media: useSelection('media'), extensions: useSelection('extensions') },
    VJS10_VERSION
  );

  return <PackageManagerTabs commands={install} />;
}

export default withSelectionMarker(ReactInstallTabs);

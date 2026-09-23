import { generateReactInstallCode } from '@videojs/installation';

import PackageManagerTabs from './PackageManagerTabs';
import { useSelection } from './useSelection';

export default function ReactInstallTabs() {
  const install = generateReactInstallCode({ renderer: useSelection('renderer') });

  return <PackageManagerTabs commands={install} />;
}

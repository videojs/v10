import { generateHTMLInstallCode } from '@videojs/installation';

import PackageManagerTabs from './PackageManagerTabs';
import { useSelection } from './useSelection';

export default function HTMLInstallTabs() {
  const $renderer = useSelection('renderer');
  const $extensions = useSelection('extensions');
  const $skin = useSelection('skin');
  const $useCase = useSelection('useCase');
  const install = generateHTMLInstallCode(
    { renderer: $renderer, extensions: $extensions, skin: $skin, useCase: $useCase },
    []
  );

  return <PackageManagerTabs commands={install} />;
}

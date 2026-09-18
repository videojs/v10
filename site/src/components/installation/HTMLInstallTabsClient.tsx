import { generateHTMLInstallCode } from '@/utils/installation/codegen';

import PackageManagerTabs from './PackageManagerTabs';
import { useSelection } from './useSelection';

export default function HTMLInstallTabs() {
  const $renderer = useSelection('renderer');
  const $skin = useSelection('skin');
  const $useCase = useSelection('useCase');
  const install = generateHTMLInstallCode({ renderer: $renderer, skin: $skin, useCase: $useCase }, []);

  return <PackageManagerTabs commands={install} />;
}

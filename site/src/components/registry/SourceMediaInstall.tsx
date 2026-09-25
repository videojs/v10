import { generateSourceMediaInstallCode, getAdapterPackage } from '@videojs/installation';

import PackageManagerTabs from '@/components/installation/PackageManagerTabs';
import { shared } from '@/components/typography/styles';
import { VJS10_VERSION } from '@/consts';

import { useSelection } from '../installation/useSelection';

export default function SourceMediaInstall() {
  const renderer = useSelection('renderer');
  const selectedExtensions = useSelection('extensions');
  const install = generateSourceMediaInstallCode(renderer, VJS10_VERSION, selectedExtensions);
  if (!install) return <span id="install-the-media-adapter" hidden data-conditional-heading-placeholder />;

  const hasAdapter = getAdapterPackage(renderer) !== null;
  const title = hasAdapter
    ? selectedExtensions.length > 0
      ? 'Install the media adapter and extensions'
      : 'Install the media adapter'
    : 'Install the extensions';

  return (
    <section className="mx-auto mt-16 w-full max-w-3xl" aria-labelledby="install-the-media-adapter">
      <h2 id="install-the-media-adapter" className="font-display text-h3 @lg:text-h25 mb-8 leading-tight uppercase">
        {title}
      </h2>
      <p className={`${shared.p} ${shared.prose}`}>
        Install the supporting packages at the version that matches this Video.js release.
      </p>
      <PackageManagerTabs commands={install} />
    </section>
  );
}

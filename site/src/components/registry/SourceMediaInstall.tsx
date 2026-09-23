import { generateSourceMediaInstallCode } from '@videojs/installation';

import PackageManagerTabs from '@/components/installation/PackageManagerTabs';
import { shared } from '@/components/typography/styles';

import { useSelection } from '../installation/useSelection';

export default function SourceMediaInstall() {
  const install = generateSourceMediaInstallCode(useSelection('renderer'));
  if (!install) return <span id="install-the-media-adapter" hidden data-conditional-heading-placeholder />;

  return (
    <section className="mx-auto mt-16 w-full max-w-3xl" aria-labelledby="install-the-media-adapter">
      <h2 id="install-the-media-adapter" className="font-display text-h3 @lg:text-h25 mb-8 leading-tight uppercase">
        Install the media adapter
      </h2>
      <p className={`${shared.p} ${shared.prose}`}>
        This media source needs a separate playback adapter. Install it with your package manager.
      </p>
      <PackageManagerTabs commands={install} />
    </section>
  );
}

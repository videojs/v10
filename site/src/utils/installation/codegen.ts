import {
  generateHTMLInstallCode as generateSharedHTMLInstallCode,
  type InstallationOptions,
} from '@videojs/installation';

import { VJS10_CDN_BASE } from '@/consts';

export {
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  generateSourceHTMLUsageCode,
  generateSourceMediaInstallCode,
  generateSourceReactCreateCode,
  generateSvelteCreateCode,
  generateSvelteUsageCode,
  generateVueCreateCode,
  generateVueCustomElementConfigCode,
  generateVueUsageCode,
  getAdapterPackage,
  getRendererComponent,
  getRendererTag,
  getSkinComponent,
  getSkinTag,
  resolveInstallationSourceUrl,
  validateInstallationOptions,
  type HTMLUsageCode,
  type InstallationOptions,
  type SourceHTMLUsageCode,
  type SvelteCreateCode,
  type SvelteUsageCode,
  type VueCreateCode,
  type VueCustomElementConfigCode,
  type VueUsageCode,
} from '@videojs/installation';

export function generateHTMLInstallCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
  cdnMediaSubpaths: readonly string[]
) {
  return generateSharedHTMLInstallCode(opts, cdnMediaSubpaths, VJS10_CDN_BASE);
}

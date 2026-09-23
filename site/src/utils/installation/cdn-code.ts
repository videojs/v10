import {
  generateCdnCode as generateSharedCdnCode,
  rendererSupportsCdn,
  renderersWithoutCdn,
  type Renderer,
  type Skin,
  type UseCase,
} from '@videojs/installation';

import { VJS10_CDN_BASE } from '@/consts';

export { rendererSupportsCdn, renderersWithoutCdn };

export function generateCdnCode(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  cdnMediaSubpaths: readonly string[]
): string {
  return generateSharedCdnCode(useCase, skin, renderer, cdnMediaSubpaths, VJS10_CDN_BASE);
}

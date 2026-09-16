import ClientCode from '@/components/Code/ClientCode';
import { generateCdnCode } from '@/utils/installation/cdn-code';

import { useSelection } from './useSelection';

interface HTMLCdnCodeBlockProps {
  /** Media subpaths that ship a CDN build, from the cdn-media manifest. */
  cdnMedia: string[];
}

export default function HTMLCdnCodeBlock({ cdnMedia }: HTMLCdnCodeBlockProps) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('renderer');

  return <ClientCode code={generateCdnCode($useCase, $skin, $renderer, cdnMedia)} lang="html" />;
}

import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { renderer, skin, useCase } from '@/stores/installation';
import { generateCdnCode } from '@/utils/installation/cdn-code';

interface HTMLCdnCodeBlockProps {
  /** Media subpaths that ship a CDN build, from the cdn-media manifest. */
  cdnMedia: string[];
}

export default function HTMLCdnCodeBlock({ cdnMedia }: HTMLCdnCodeBlockProps) {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);

  return <ClientCode code={generateCdnCode($useCase, $skin, $renderer, cdnMedia)} lang="html" />;
}

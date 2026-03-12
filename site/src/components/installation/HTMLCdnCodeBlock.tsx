import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { renderer, skin, useCase } from '@/stores/installation';
import { generateCdnCode } from '@/utils/installation/cdn-code';

export default function HTMLCdnCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);

  return <ClientCode code={generateCdnCode($useCase, $skin, $renderer)} lang="html" />;
}

import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import type { Skin, UseCase } from '@/stores/installation';
import { skin, useCase } from '@/stores/installation';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

function getCdnFileName(useCase: UseCase, skin: Skin): string {
  if (useCase === 'background-video') return 'background';
  if (skin === 'minimal-video') return 'video-minimal';
  if (skin === 'minimal-audio') return 'audio-minimal';
  return skin;
}

function generateCdnCode(useCase: UseCase, skin: Skin): string {
  const name = getCdnFileName(useCase, skin);

  return `<script type="module" src="${CDN_BASE}/${name}.js"></script>
<link rel="stylesheet" href="${CDN_BASE}/${name}.css" />`;
}

export default function HTMLCdnCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);

  return <ClientCode code={generateCdnCode($useCase, $skin)} lang="html" />;
}

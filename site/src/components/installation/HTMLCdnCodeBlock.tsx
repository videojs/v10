import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import type { Skin, UseCase } from '@/stores/installation';
import { skin, useCase } from '@/stores/installation';

function getSkinImportParts(skin: Skin): { group: string; skinFile: string } {
  if (skin === 'minimal-video') return { group: 'video', skinFile: 'minimal-skin' };
  if (skin === 'minimal-audio') return { group: 'audio', skinFile: 'minimal-skin' };
  return { group: skin, skinFile: 'skin' };
}

// jsdelivr doesn't resolve Node package exports, so we use the full file path
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html@next/dist/default/define';

function generateCdnCode(useCase: UseCase, skin: Skin): string {
  if (useCase === 'background-video') {
    return `<script>
  import '${CDN_BASE}/background/player.js';
  import '${CDN_BASE}/background/skin.js';
</script>
<link rel="stylesheet" href="${CDN_BASE}/background/skin.css" />`;
  }

  const { group, skinFile } = getSkinImportParts(skin);

  return `<script>
  import '${CDN_BASE}/${group}/player.js';
  import '${CDN_BASE}/${group}/${skinFile}.js';
</script>
<link rel="stylesheet" href="${CDN_BASE}/${group}/${skinFile}.css" />`;
}

export default function HTMLCdnCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);

  return <ClientCode code={generateCdnCode($useCase, $skin)} lang="html" />;
}

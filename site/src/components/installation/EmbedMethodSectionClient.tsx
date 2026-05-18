import { useStore } from '@nanostores/react';
import { embedMethod, skin, useCase } from '@/stores/installation';

export default function EmbedMethodSectionClient({ children }: { children: React.ReactNode }) {
  const $embedMethod = useStore(embedMethod);
  const $skin = useStore(skin);
  const $useCase = useStore(useCase);

  const activeMethod = $useCase === 'background-video' ? 'packaged' : $embedMethod;

  return (
    <div className="contents" data-active-embed-method={activeMethod} data-active-skin={$skin}>
      {children}
    </div>
  );
}

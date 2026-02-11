import { useStore } from '@nanostores/react';
import { currentFramework } from '@/stores/preferences';
import { buildDocsUrl } from '@/utils/docs/routing';
import { findFirstGuide } from '@/utils/docs/sidebar';
import useIsHydrated from '@/utils/useIsHydrated';

export interface GetStartedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode;
}

export default function GetStartedLink({ children, ...props }: GetStartedLinkProps) {
  const framework = useStore(currentFramework);
  const isHydrated = useIsHydrated();

  const href = isHydrated && framework ? buildDocsUrl(framework, findFirstGuide(framework)) : '/docs';

  return (
    <a {...props} href={href}>
      {children}
    </a>
  );
}

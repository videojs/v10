'use client';

import type { ReactNode } from 'react';

export interface SkinProps {
  children?: ReactNode;
  className?: string;
}

/**
 * @example
 * ```tsx
 * import { Video } from '@videojs/react';
 * import { Provider, Skin } from '@videojs/react/skins/frosted';
 *
 * function App() {
 *   return (
 *     <Provider>
 *       <Skin>
 *         <Video src="video.mp4" />
 *       </Skin>
 *     </Provider>
 *   );
 * }
 * ```
 */
export function Skin({ children, className }: SkinProps): React.JSX.Element {
  return <div className={`vjs-frosted-skin ${className ?? ''}`.trim()}>{children}</div>;
}

export namespace Skin {
  export type Props = SkinProps;
}

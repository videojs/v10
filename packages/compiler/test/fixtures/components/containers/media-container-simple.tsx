/**
 * MediaContainer - Simple with children
 */

import type { PropsWithChildren } from 'react';
import { MediaContainer } from '@videojs/react';

export default function TestFixture({ children }: PropsWithChildren) {
  return (
    <MediaContainer className="container">
      {children}
    </MediaContainer>
  );
}

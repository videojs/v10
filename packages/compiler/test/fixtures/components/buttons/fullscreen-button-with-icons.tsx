/**
 * FullscreenButton - With Icons
 */

import { FullscreenButton } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react/icons';

export default function TestFixture() {
  return (
    <FullscreenButton className="fullscreen-btn">
      <FullscreenEnterIcon className="enter-icon" />
      <FullscreenExitIcon className="exit-icon" />
    </FullscreenButton>
  );
}

import type { Renderer } from '@videojs/installation';

import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

interface MediaSourceCaseProps {
  /** Show the children only while one of these media sources is selected. */
  renderers: Renderer[];
  children: React.ReactNode;
}

/** Client-side gate for installation prose that only applies to some media source picks. */
function MediaSourceCase({ renderers, children }: MediaSourceCaseProps) {
  const $renderer = useSelection('renderer');
  if (!renderers.includes($renderer)) return null;

  return children;
}

export default withSelectionMarker(MediaSourceCase);

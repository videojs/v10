/** @TODO !!! Revisit for SSR (CJP) */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { createPlayerStore } from '../player-store';

import { PlayerContext } from './context';

export function VideoProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const store = useMemo(() => createPlayerStore(), []);

  // useEffect(() => {
  //   value?.dispatch({
  //     type: 'documentelementchangerequest',
  //     detail: globalThis.document,
  //   });
  //   return () => {
  //     value?.dispatch({
  //       type: 'documentelementchangerequest',
  //       detail: undefined,
  //     });
  //   };
  // }, []);

  return <PlayerContext.Provider value={store}>{children}</PlayerContext.Provider>;
}

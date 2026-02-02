import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { createPlayerStore } from '../player-store';

import { PlayerContext } from './context';

export function VideoProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const store = useMemo(() => createPlayerStore(), []);

  // useEffect(() => {
  //   store?.attach({
  //     document: globalThis.document,
  //   });
  //   return () => {
  //     store?.attach({
  //       document: undefined,
  //     });
  //   };
  // }, []);

  return <PlayerContext.Provider value={store}>{children}</PlayerContext.Provider>;
}

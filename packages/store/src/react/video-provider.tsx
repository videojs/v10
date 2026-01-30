/** @TODO !!! Revisit for SSR (CJP) */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { createPlayerStore } from '../player-store';

import { MediaContext } from './context';

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

  return <MediaContext.Provider value={store}>{children}</MediaContext.Provider>;
}

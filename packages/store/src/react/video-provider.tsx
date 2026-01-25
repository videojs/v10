/** @TODO !!! Revisit for SSR (CJP) */

import { createMediaStore } from '@videojs/store';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { MediaContext } from './context';

export function VideoProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const value = useMemo(() => createMediaStore(), []);

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

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

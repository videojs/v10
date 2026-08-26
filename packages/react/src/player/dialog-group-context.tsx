import type { DialogGroup } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

const DialogGroupContext = createContext<DialogGroup | undefined>(undefined);

export function DialogGroupProvider({ value, children }: { value: DialogGroup; children: ReactNode }): ReactNode {
  return <DialogGroupContext.Provider value={value}>{children}</DialogGroupContext.Provider>;
}

export function useOptionalDialogGroup(): DialogGroup | undefined {
  return useContext(DialogGroupContext);
}

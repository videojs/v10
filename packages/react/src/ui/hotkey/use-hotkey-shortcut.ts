'use client';

import { getHotkeyCoordinator, type HotkeyShortcutDetails } from '@videojs/core/dom';
import { useEffect, useState } from 'react';

import { useContainer } from '../../player/context';

export function useHotkeyShortcut(action: string | undefined, value?: number | undefined): HotkeyShortcutDetails {
  const container = useContainer();

  const [shortcut, setShortcut] = useState<HotkeyShortcutDetails>({});

  useEffect(() => {
    if (!container || !action) {
      setShortcut({});
      return;
    }

    const coordinator = getHotkeyCoordinator(container);
    const update = () => setShortcut(coordinator.getShortcut(action, value));

    update();
    return coordinator.subscribeShortcutChanges(update);
  }, [container, action, value]);

  return shortcut;
}

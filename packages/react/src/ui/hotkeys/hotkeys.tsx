'use client';

import { HotkeysCore } from '@videojs/core';
import { bindHotKeys } from '@videojs/core/dom';
import { useEffect, useState } from 'react';

import { useContainer, usePlayer } from '../../player/context';

export function Hotkeys() {
  const [core] = useState(() => new HotkeysCore());
  const store = usePlayer();

  core.setMedia(store);

  const container = useContainer();

  useEffect(() => {
    if (!container) return;

    return bindHotKeys({ container, core });
  }, [container, core]);

  return null;
}

if (__DEV__) Hotkeys.displayName = 'Hotkeys';

import type { StateOwners } from '../types';

export const audible = {
  muted: {
    get(stateOwners: StateOwners): boolean {
      const { media } = stateOwners;
      return media?.muted ?? false;
    },
    set(value: boolean, stateOwners: StateOwners): void {
      const { media } = stateOwners;
      if (!media) return;
      media.muted = value;
      if (!value && !media.volume) {
        media.volume = 0.25;
      }
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: boolean) => void, stateOwners: StateOwners): (() => void) | void => {
        const { media } = stateOwners;
        if (!media) return;

        const eventHandler = () => handler();
        media.addEventListener('volumechange', eventHandler);

        return () => media.removeEventListener('volumechange', eventHandler);
      },
    ] as const,
    actions: {
      /** @TODO Refactor me to play more nicely with side effects that don't/can't correlate with set() API or aren't simple 1:1 with getter vs. setter (CJP) */
      muterequest: () => true,
      unmuterequest: () => false,
    },
  },
  volume: {
    get(stateOwners: StateOwners): number {
      const { media } = stateOwners;
      return media?.volume ?? 1.0;
    },
    set(value: number, stateOwners: StateOwners): void {
      const { media } = stateOwners;
      if (!media) return;
      const numericValue = +value;
      if (!Number.isFinite(numericValue)) return;
      media.volume = numericValue;
      if (numericValue > 0) {
        media.muted = false;
      }
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: number) => void, stateOwners: StateOwners): (() => void) | void => {
        const { media } = stateOwners;
        if (!media) return;

        const eventHandler = () => handler();
        media.addEventListener('volumechange', eventHandler);

        return () => media.removeEventListener('volumechange', eventHandler);
      },
    ] as const,
    actions: {
      /** @TODO Refactor me to play more nicely with side effects that don't/can't correlate with set() API (CJP) */
      volumerequest: ({ detail }: Pick<CustomEvent<any>, 'detail'> = { detail: 0 }): number => +detail,
    },
  },
  // NOTE: This could be (re)implemented as "derived state" in some manner (e.g. selectors but also other patterns/conventions) if preferred. (CJP)
  volumeLevel: {
    get(stateOwners: StateOwners): 'high' | 'medium' | 'low' | 'off' {
      const { media } = stateOwners;
      if (typeof media?.volume == 'undefined') return 'high';
      if (media.muted || media.volume === 0) return 'off';
      if (media.volume < 0.5) return 'low';
      if (media.volume < 0.75) return 'medium';
      return 'high';
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: 'high' | 'medium' | 'low' | 'off') => void, stateOwners: any): void | (() => void) => {
        const { media } = stateOwners;
        if (!media) return;

        const eventHandler = () => handler();
        media.addEventListener('volumechange', eventHandler);

        return () => media.removeEventListener('volumechange', eventHandler);
      },
    ] as const,
  },
};

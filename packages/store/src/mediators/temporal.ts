import { isValidNumber } from '@videojs/utils';

export const temporal = {
  currentTime: {
    get(stateOwners: any): number {
      const { media } = stateOwners;
      return media?.currentTime ?? 0;
    },
    set(value: number, stateOwners: any): void {
      const { media } = stateOwners;
      if (!media || !isValidNumber(value)) return;
      media.currentTime = value;
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: number) => void, stateOwners: any): void | (() => void) => {
        const { media } = stateOwners;
        if (!media) return;

        const eventHandler = () => handler();
        const events = ['timeupdate', 'loadedmetadata'];
        events.forEach(event => media.addEventListener(event, eventHandler));

        return () => events.forEach(event => media.removeEventListener(event, eventHandler));
      },
    ] as const,
    actions: {
      /** @TODO Support more sophisticated seeking patterns like seek-to-live, relative seeking, etc. (CJP) */
      seekrequest: ({ detail }: Pick<CustomEvent<any>, 'detail'> = { detail: 0 }): number => +detail,
    },
  },

  duration: {
    get(stateOwners: any): number {
      const { media } = stateOwners;

      // Return 0 if no media or invalid duration
      if (!media?.duration || Number.isNaN(media.duration) || !Number.isFinite(media.duration)) {
        return 0;
      }

      return media.duration;
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: number) => void, stateOwners: any): void | (() => void) => {
        const { media } = stateOwners;
        if (!media) return;

        const eventHandler = () => handler();
        const events = ['loadedmetadata', 'durationchange', 'emptied'];
        events.forEach(event => media.addEventListener(event, eventHandler));

        return () => events.forEach(event => media.removeEventListener(event, eventHandler));
      },
    ] as const,
  },

  seekable: {
    get(stateOwners: any): [number, number] | undefined {
      const { media } = stateOwners;

      if (!media?.seekable?.length) return undefined;

      const start = media.seekable.start(0);
      const end = media.seekable.end(media.seekable.length - 1);

      // Account for cases where metadata has an "empty" seekable range
      if (!start && !end) return undefined;

      return [Number(start.toFixed(3)), Number(end.toFixed(3))];
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: [number, number] | undefined) => void, stateOwners: any): void | (() => void) => {
        const { media } = stateOwners;
        if (!media) return;

        const eventHandler = () => handler();
        const events = ['loadedmetadata', 'emptied', 'progress', 'seekablechange'];
        events.forEach(event => media.addEventListener(event, eventHandler));

        return () => events.forEach(event => media.removeEventListener(event, eventHandler));
      },
    ] as const,
  },
};

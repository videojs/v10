/**
 * Global type declarations for MediaSource APIs.
 */

/**
 * ManagedMediaSource is a newer Safari API not yet in standard DOM types.
 * Provides better lifecycle management for background tabs and picture-in-picture.
 */
declare global {
  interface ManagedMediaSource extends MediaSource {
    /** True when the browser wants the app to be streaming data. */
    readonly streaming: boolean;
    addEventListener(type: 'startstreaming', listener: EventListener): void;
    addEventListener(type: 'endstreaming', listener: EventListener): void;
    removeEventListener(type: 'startstreaming', listener: EventListener): void;
    removeEventListener(type: 'endstreaming', listener: EventListener): void;
  }

  const ManagedMediaSource:
    | {
        prototype: ManagedMediaSource;
        new (): ManagedMediaSource;
        isTypeSupported: (type: string) => boolean;
      }
    | undefined;
}

export {};

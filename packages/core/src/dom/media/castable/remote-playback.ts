import type { GoogleCastProvider } from './google-cast-provider';
import { InvalidStateError, NotFoundError } from './utils';

export type RemotePlaybackState = 'disconnected' | 'connecting' | 'connected';

type AvailabilityCallback = (available: boolean) => void;

let callbackIdCount = 0;

export class RemotePlayback extends EventTarget {
  #provider: GoogleCastProvider;
  #state: RemotePlaybackState = 'disconnected';
  #available = false;
  #callbacks = new Map<number, AvailabilityCallback>();

  constructor(provider: GoogleCastProvider) {
    super();
    this.#provider = provider;
    provider.bindHooks({
      setState: (next) => this.#setState(next),
      setAvailable: (available) => this.#setAvailable(available),
    });
  }

  get state() {
    return this.#state;
  }

  async watchAvailability(callback: AvailabilityCallback) {
    if (this.#provider.media.disableRemotePlayback) {
      throw new InvalidStateError('disableRemotePlayback attribute is present.');
    }

    const id = ++callbackIdCount;
    this.#callbacks.set(id, callback);

    queueMicrotask(() => callback(this.#provider.hasDevicesAvailable()));

    return id;
  }

  async cancelWatchAvailability(callbackId?: number) {
    if (this.#provider.media.disableRemotePlayback) {
      throw new InvalidStateError('disableRemotePlayback attribute is present.');
    }

    if (callbackId !== undefined) {
      if (!this.#callbacks.delete(callbackId)) {
        throw new NotFoundError(`Callback not found for id ${callbackId}.`);
      }
      return;
    }

    this.#callbacks.clear();
  }

  async prompt() {
    if (this.#provider.media.disableRemotePlayback) {
      throw new InvalidStateError('disableRemotePlayback attribute is present.');
    }

    await this.#provider.requestCastSession();
  }

  #setState(next: RemotePlaybackState) {
    if (this.#state === next) return;
    this.#state = next;
    if (next === 'connecting') this.dispatchEvent(new Event('connecting'));
    else if (next === 'connected') this.dispatchEvent(new Event('connect'));
    else this.dispatchEvent(new Event('disconnect'));
  }

  #setAvailable(available: boolean) {
    if (this.#available === available) return;
    this.#available = available;
    for (const callback of this.#callbacks.values()) callback(available);
  }
}

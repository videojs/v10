import { type RemotePlaybackLike, type RemotePlaybackState, TypedEventTarget } from '../../../core/media/types';

export interface RemotePlaybackBridgeInit {
  disabled?: () => boolean;
  prompt: () => Promise<void> | void;
  availability?: () => boolean;
}

export class RemotePlaybackBridge extends TypedEventTarget<RemotePlaybackEventMap>() implements RemotePlaybackLike {
  #state: RemotePlaybackState = 'disconnected';
  #disabled: () => boolean;
  #prompt: () => Promise<void> | void;
  #availability: () => boolean;
  #available = false;
  #callbackId = 0;
  #callbacks = new Map<number, RemotePlaybackAvailabilityCallback>();

  constructor({ disabled = () => false, prompt, availability = () => false }: RemotePlaybackBridgeInit) {
    super();
    this.#disabled = disabled;
    this.#prompt = prompt;
    this.#availability = availability;
  }

  get state(): RemotePlaybackState {
    return this.#state;
  }

  setState(next: RemotePlaybackState): void {
    if (this.#state === next) return;
    this.#state = next;

    if (next === 'connecting') this.dispatchEvent(new Event('connecting'));
    else if (next === 'connected') this.dispatchEvent(new Event('connect'));
    else this.dispatchEvent(new Event('disconnect'));
  }

  setAvailability(available: boolean): void {
    if (this.#available === available) return;
    this.#available = available;
    for (const callback of this.#callbacks.values()) callback(available);
  }

  async prompt(): Promise<void> {
    this.#assertEnabled();
    await this.#prompt();
  }

  async watchAvailability(callback: RemotePlaybackAvailabilityCallback): Promise<number> {
    this.#assertEnabled();

    const id = ++this.#callbackId;
    this.#callbacks.set(id, callback);

    queueMicrotask(() => {
      if (!this.#callbacks.has(id)) return;
      const available = this.#available || this.#availability();
      this.#available = available;
      callback(available);
    });

    return id;
  }

  async cancelWatchAvailability(callbackId?: number): Promise<void> {
    this.#assertEnabled();

    if (callbackId === undefined) {
      this.#callbacks.clear();
      return;
    }

    if (!this.#callbacks.delete(callbackId)) {
      throw new DOMException(`Callback not found for id ${callbackId}.`, 'NotFoundError');
    }
  }

  #assertEnabled(): void {
    if (this.#disabled()) throw new DOMException('disableRemotePlayback attribute is present.', 'InvalidStateError');
  }
}

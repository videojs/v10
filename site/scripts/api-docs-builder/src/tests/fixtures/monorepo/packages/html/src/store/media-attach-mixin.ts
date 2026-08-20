type Constructor<T = object> = new (...args: any[]) => T;

/** Create a mixin that registers a media element with a player. */
export function createMediaAttachMixin<T extends Constructor<HTMLElement>>(Base: T): T {
  return Base;
}

import type { MediaLayer } from './media-layer';

type AnyMediaLayer = MediaLayer<any, any>;

export interface MediaExtension {
  install(media: AnyMediaLayer): void;
  destroy(): void;
}

export type MediaExtensionFactory<T extends MediaExtension = MediaExtension> = () => T;
export interface MediaExtensionRegistry extends Map<MediaExtensionFactory, MediaExtension> {
  get<T extends MediaExtension>(extension: MediaExtensionFactory<T>): T | undefined;
  set<T extends MediaExtension>(extension: MediaExtensionFactory<T>, instance: T): this;
}

const installedExtensions = new WeakMap<AnyMediaLayer, MediaExtensionRegistry>();

export function installExtension<T extends MediaExtension>(
  extension: MediaExtensionFactory<T>,
  media: AnyMediaLayer,
  instance: T
) {
  const extensions = getExtensions(media);
  extensions.set(extension, instance);
  return () => {
    if (extensions.get(extension) === instance) extensions.delete(extension);
  };
}

export function getExtensions(media: AnyMediaLayer) {
  let map = installedExtensions.get(media);
  if (!map) installedExtensions.set(media, (map = new Map() as MediaExtensionRegistry));
  return map;
}

interface MediaTrackOwner {
  readonly constructor: Function;
}

interface PrivateMediaTrackState {
  activeChangeRequested?: boolean;
  audioRenditions?: MediaTrackOwner;
  audioTracks?: MediaTrackOwner;
  audioTracksCleanup?: AbortController;
  changeRequested?: boolean;
  media?: WeakRef<HTMLMediaElement>;
  renditionSet?: ReadonlySet<MediaTrackOwner>;
  track?: MediaTrackOwner;
  trackSet?: ReadonlySet<MediaTrackOwner>;
  videoRenditions?: MediaTrackOwner;
  videoTracks?: MediaTrackOwner;
  videoTracksCleanup?: AbortController;
}

const privateProps = new WeakMap<object, PrivateMediaTrackState>();

export function getPrivate(instance: MediaTrackOwner) {
  return privateProps.get(instance) ?? setPrivate(instance, {});
}

export function setPrivate(instance: MediaTrackOwner, props: Partial<PrivateMediaTrackState>) {
  let saved = privateProps.get(instance);
  if (!saved) privateProps.set(instance, (saved = {}));

  return Object.assign(saved, props);
}

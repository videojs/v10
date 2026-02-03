export function hasMetadata(media: HTMLMediaElement): boolean {
  return media.readyState >= HTMLMediaElement.HAVE_METADATA;
}

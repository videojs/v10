export function renderStoryboard(src?: string | undefined): string {
  return src ? `<track kind="metadata" label="thumbnails" src="${src}" />` : '';
}

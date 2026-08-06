export function renderChapters(src?: string | undefined): string {
  return src ? `<track kind="chapters" label="English" srclang="en" src="${src}" default />` : '';
}

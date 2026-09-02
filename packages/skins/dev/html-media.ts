import type { SandboxSource } from '../../../apps/sandbox/app/shared/sources';
import type { CaptionsMode } from './options';

export interface HtmlPreviewMediaOptions {
  readonly captions: string;
  readonly captionsMode: CaptionsMode;
  readonly isAudio: boolean;
  readonly media: SandboxSource;
  readonly storyboard: string | undefined;
}

export async function defineHtmlMedia({ isAudio, media }: HtmlPreviewMediaOptions): Promise<void> {
  if (isAudio && (media.source || media.type === 'hls')) {
    await import('../../html/src/define/media/mux-audio/hls-js');
    return;
  }

  if (media.source || media.type === 'hls') {
    await import('../../html/src/define/media/mux-video/hls-js');
  } else if (media.type === 'dash') {
    await import('../../html/src/define/media/dash-video');
  }
}

export function renderHtmlMedia({
  captions,
  captionsMode,
  isAudio,
  media,
  storyboard,
}: HtmlPreviewMediaOptions): string {
  const tag = isAudio
    ? media.source || media.type === 'hls'
      ? 'mux-audio'
      : 'audio'
    : media.source
      ? 'mux-video'
      : media.type === 'dash'
        ? 'dash-video'
        : media.type === 'hls'
          ? 'mux-video'
          : 'video';
  const sourceAttribute = media.source || !media.url ? '' : ` src="${escapeAttribute(media.url)}"`;
  const chapterTracks =
    media.chapters
      ?.map(
        ({ isDefault, label, lang, src }) =>
          `<track kind="chapters" label="${escapeAttribute(label)}" src="${escapeAttribute(src)}" srclang="${escapeAttribute(lang)}"${isDefault ? ' default' : ''}>`
      )
      .join('') ?? '';
  const storyboardTrack = storyboard
    ? `<track kind="metadata" label="thumbnails" src="${escapeAttribute(storyboard)}" default>`
    : '';
  const videoTracks = isAudio
    ? ''
    : `<track kind="subtitles" label="English" src="${escapeAttribute(captions)}" srclang="en">${
        captionsMode === 'multiple'
          ? `<track kind="subtitles" label="Spanish" src="${escapeAttribute(captions)}" srclang="es">`
          : ''
      }${storyboardTrack}`;

  return `<${tag} data-preview-media${sourceAttribute} playsinline crossorigin="anonymous">${videoTracks}${chapterTracks}</${tag}>`;
}

export function assignHtmlMediaSource(root: ParentNode, source: SandboxSource['source']): void {
  if (!source) return;

  const elements = root.querySelectorAll<HTMLElement & { source: NonNullable<SandboxSource['source']> }>(
    '[data-preview-media]'
  );
  if (elements.length === 0) throw new Error('Expected the structured-source media element to exist.');

  for (const element of elements) element.source = source;
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

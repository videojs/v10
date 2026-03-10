import { MinimalAudioSkinTailwindElement } from '@videojs/html/audio/minimal-skin.tailwind';
import { AudioSkinTailwindElement } from '@videojs/html/audio/skin.tailwind';
import { MinimalVideoSkinTailwindElement } from '@videojs/html/video/minimal-skin.tailwind';
import { VideoSkinTailwindElement } from '@videojs/html/video/skin.tailwind';
import tailwindCSS from '../../styles.css?inline';

const tailwindStyles = new CSSStyleSheet();
tailwindStyles.replaceSync(tailwindCSS);

export function setupVideoTailwind() {
  VideoSkinTailwindElement.styles = tailwindStyles;
  MinimalVideoSkinTailwindElement.styles = tailwindStyles;
}

export function setupAudioTailwind() {
  AudioSkinTailwindElement.styles = tailwindStyles;
  MinimalAudioSkinTailwindElement.styles = tailwindStyles;
}

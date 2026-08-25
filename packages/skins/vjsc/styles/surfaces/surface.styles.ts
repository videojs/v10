import { styles } from 'vjsc/styles';

const base = [
  'text-white backdrop-blur-lg backdrop-saturate-150',
  'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
  'after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:ring-1 [@media(prefers-reduced-transparency:reduce)]:ring-transparent',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'contrast-more:bg-black contrast-more:ring-1 contrast-more:ring-transparent contrast-more:backdrop-filter-none',
  'contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'forced-colors:bg-[Canvas] forced-colors:ring-1 forced-colors:ring-[CanvasText]',
  'forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
] as const;

const defaultVariant = [
  ...base,
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const minimalVariant = [
  ...base,
  'shadow-sm shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/20',
  'contrast-more:shadow-sm contrast-more:shadow-black/20',
  'forced-colors:shadow-sm forced-colors:shadow-black/20',
  'bg-black/50',
] as const;

export default styles({
  file: 'common.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-surface',
      utilities: [],
      variants: {
        default: defaultVariant,
        minimal: minimalVariant,
      },
    },
    feedback: {
      className: 'media-feedback-surface',
      utilities: [],
      variants: {
        default: defaultVariant,
        minimal: [],
      },
    },
  },
});

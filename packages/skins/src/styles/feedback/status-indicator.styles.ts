import { styles } from 'vjsc/styles';

import { popupSurface } from '../recipes/popup';
import { themeRecipe } from '../recipes/theme';

const icon = ['hidden shrink-0'] as const;

const themedIcon = themeRecipe('mix-blend-difference', 'drop-shadow-[0_1px_0_var(--media-shadow-current-color)]');

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-status-indicator',
      utilities: [
        'group/input-status pointer-events-none absolute origin-top text-inherit',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
        ...themeRecipe(
          [
            ...popupSurface,
            'top-3 rounded-[9999px] bg-black/25 font-medium',
            'data-starting-style:duration-250 data-starting-style:ease-in',
            'data-ending-style:duration-250 data-ending-style:ease-in',
            'pointer-coarse:[transition-property:scale,translate,opacity] pointer-coarse:will-change-[scale,translate,opacity]',
            'pointer-fine:motion-safe:[transition-property:scale,translate,filter,opacity]',
            'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
            'duration-100 ease-out',
            'pointer-fine:motion-safe:data-starting-style:scale-90 pointer-fine:motion-safe:data-starting-style:blur-sm',
            'pointer-fine:motion-safe:data-ending-style:scale-90 pointer-fine:motion-safe:data-ending-style:blur-sm',
            'motion-safe:data-ending-style:-translate-y-1/4',
          ],
          [
            'inset-x-0 top-0 flex justify-center pt-3 pb-32',
            'bg-[linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_calc(var(--media-spacing)*12),transparent)]',
            'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
            'data-starting-style:duration-400 data-starting-style:ease-in',
            'data-ending-style:duration-400 data-ending-style:ease-in',
            'pointer-fine:[transition-property:translate,filter,opacity] pointer-fine:will-change-[translate,filter,opacity]',
            'pointer-coarse:[transition-property:translate,opacity] pointer-coarse:will-change-[translate,opacity]',
            'duration-100 ease-out',
            'pointer-fine:motion-safe:data-starting-style:blur-sm pointer-fine:motion-safe:data-ending-style:blur-sm',
            'motion-safe:data-ending-style:-translate-y-full',
          ]
        ),
      ],
    },
    content: {
      className: 'media-status-indicator-content',
      utilities: [
        'flex items-center justify-between gap-2 px-2.5 py-1',
        ...themeRecipe('w-full', [
          '[@media(prefers-reduced-transparency:reduce)]:rounded-[--spacing(2)]',
          '[@media(prefers-reduced-transparency:reduce)]:bg-black',
          'contrast-more:rounded-[--spacing(2)] contrast-more:bg-black',
        ]),
      ],
    },
    captionsOnIcon: {
      className: 'media-status-indicator-captions-on-icon',
      utilities: [...icon, 'group-data-[status=captions-on]/input-status:block', ...themedIcon],
    },
    captionsOffIcon: {
      className: 'media-status-indicator-captions-off-icon',
      utilities: [...icon, 'group-data-[status=captions-off]/input-status:block', ...themedIcon],
    },
    fullscreenEnterIcon: {
      className: 'media-status-indicator-fullscreen-enter-icon',
      utilities: [...icon, 'group-data-[status=fullscreen]/input-status:block', ...themedIcon],
    },
    fullscreenExitIcon: {
      className: 'media-status-indicator-fullscreen-exit-icon',
      utilities: [...icon, 'group-data-[status=exit-fullscreen]/input-status:block', ...themedIcon],
    },
    pipEnterIcon: {
      className: 'media-status-indicator-pip-enter-icon',
      utilities: [...icon, 'group-data-[status=pip]/input-status:block', ...themedIcon],
    },
    pipExitIcon: {
      className: 'media-status-indicator-pip-exit-icon',
      utilities: [...icon, 'group-data-[status=exit-pip]/input-status:block', ...themedIcon],
    },
    value: {
      className: 'media-status-indicator-value',
      utilities: ['ml-auto', ...themeRecipe('mix-blend-difference', '')],
    },
  },
});

export const time = {
  group:
    '@container/media-time flex items-center flex-1 gap-2.5 [&:dir(rtl)]:flex-row-reverse @max-[16rem]/media-time:[&>*:last-child]:hidden',
  current: 'tabular-nums transition-opacity duration-200 ease-[ease] data-disabled:opacity-50',
  duration:
    'tabular-nums cursor-pointer rounded-[--spacing(1)] outline-2 outline-transparent -outline-offset-2 transition-[outline-color,outline-offset] duration-100 ease-out data-disabled:opacity-50 focus-visible:outline-(--media-focus-ring-color) focus-visible:outline-offset-2',
};

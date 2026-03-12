export const tooltipState = {
  play: {
    wrapper: 'contents group/play-tip',
    replay: 'hidden group-has-data-ended/play-tip:block',
    play: 'hidden group-[:has([data-paused]):not(:has([data-ended]))]/play-tip:block',
    pause: 'hidden group-[:not(:has([data-paused])):not(:has([data-ended]))]/play-tip:block',
  },
  fullscreen: {
    wrapper: 'contents group/fullscreen-tip',
    enter: 'hidden group-[:not(:has([data-fullscreen]))]/fullscreen-tip:block',
    exit: 'hidden group-has-data-fullscreen/fullscreen-tip:block',
  },
  captions: {
    wrapper: 'contents group/captions-tip',
    enable: 'hidden group-[:not(:has([data-active]))]/captions-tip:block',
    disable: 'hidden group-has-data-active/captions-tip:block',
  },
  pip: {
    wrapper: 'contents group/pip-tip',
    enter: 'hidden group-[:not(:has([data-pip]))]/pip-tip:block',
    exit: 'hidden group-has-data-pip/pip-tip:block',
  },
};

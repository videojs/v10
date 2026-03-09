export const tooltipState = {
  play: {
    wrapper: 'contents group/play-tip',
    replay: 'hidden group-has-data-ended/play-tip:block',
    play: 'hidden group-[:has([data-paused]):not(:has([data-ended]))]/play-tip:block',
    pause: 'hidden group-[:not(:has([data-paused])):not(:has([data-ended]))]/play-tip:block',
  },
  fullscreen: {
    wrapper: 'contents group/fs-tip',
    enter: 'hidden group-[:not(:has([data-fullscreen]))]/fs-tip:block',
    exit: 'hidden group-has-data-fullscreen/fs-tip:block',
  },
  captions: {
    wrapper: 'contents group/cc-tip',
    enable: 'hidden group-[:not(:has([data-active]))]/cc-tip:block',
    disable: 'hidden group-has-data-active/cc-tip:block',
  },
  pip: {
    wrapper: 'contents group/pip-tip',
    enter: 'hidden group-[:not(:has([data-pip]))]/pip-tip:block',
    exit: 'hidden group-has-data-pip/pip-tip:block',
  },
};

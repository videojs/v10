import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Възпроизвеждане',
    pause: 'Пауза',
    replay: 'Повтори',
    mute: 'Без звук',
    unmute: 'Със звук',
  },
  seek: {
    forward: 'Превъртане напред с {seconds} секунди',
    backward: 'Превъртане назад с {seconds} секунди',
  },
  fullscreen: {
    enter: 'Цял екран',
    exit: 'Изход от цял екран',
  },
  captions: {
    enable: 'Включи субтитри',
    disable: 'Изключи субтитри',
  },
  pip: {
    enter: 'Картина в картина',
    exit: 'Изход от картина в картина',
  },
  live: {
    playing: 'На живо',
    seekToEdge: 'Към живото предаване',
    badge: 'На живо',
  },
  cast: {
    start: 'Започни излъчване',
    stop: 'Спри излъчването',
    connecting: 'Свързване',
  },
  airplay: {
    start: 'Стартиране на AirPlay',
    stop: 'Спиране на AirPlay',
  },
  slider: {
    seek: 'Превъртане',
  },
  time: {
    current: 'Текущо време',
    duration: 'Продължителност',
    remaining: 'Оставащо време',
    remainingSuffix: 'Остават {duration}',
    showElapsed: '{duration}. Показване на изминалото време.',
    showDuration: '{duration}. Показване на продължителността.',
    showRemaining: '{duration}. Показване на оставащото време.',
    position: '{current} от {duration}',
  },
  playback: {
    rate: 'Скорост на възпроизвеждане {rate}',
  },
  volume: {
    mutedValue: '{percent}, без звук',
    muted: 'Без звук',
    label: 'Сила на звука',
    value: 'Сила на звука {value}',
  },
  status: {
    captionsOn: 'Субтитри включени',
    captionsOff: 'Субтитри изключени',
    paused: 'На пауза',
    playing: 'Възпроизвеждане',
    fullscreen: 'Цял екран',
    pip: 'Картина в картина',
    exitPip: 'Изход от картина в картина',
  },
  errors: {
    aborted: 'Спряхте възпроизвеждането на видеото',
    network: 'Грешка в мрежата провали изтеглянето на видеото.',
    decode:
      'Възпроизвеждането на видеото беше прекъснато заради проблем с файла или защото видеото използва опции които браузърът Ви не поддържа.',
    source:
      'Видеото не може да бъде заредено заради проблем със сървъра или мрежата или защото този формат не е поддържан.',
    encrypted: 'Медията е шифрована и няма ключове за дешифриране.',
    title: 'Нещо се обърка.',
    unexpected: 'Възникна грешка. Моля, опитайте отново.',
  },
  common: {
    empty: '',
    ok: 'OK',
  },
  menu: {
    settings: 'Настройки',
    quality: 'Качество',
    audio: 'Аудио',
    default: 'По подразбиране',
    speed: 'Скорост',
    captions: 'Надписи',
    playbackRate: 'Скорост на възпроизвеждане',
    back: 'Назад',
    off: 'Изкл.',
    auto: 'Авто',
    autoWithLabel: 'Авто ({label})',
    subtitles: 'Субтитри',
  },
} as const satisfies Translations;

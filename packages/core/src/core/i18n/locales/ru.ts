import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Воспроизвести',
    pause: 'Приостановить',
    replay: 'Воспроизвести снова',
    mute: 'Без звука',
    unmute: 'Со звуком',
  },
  seek: {
    forward: 'На {seconds} секунд вперед',
    backward: 'На {seconds} секунд назад',
  },
  fullscreen: {
    enter: 'Полноэкранный режим',
    exit: 'Выйти из полноэкранного режима',
  },
  captions: {
    enable: 'Включить субтитры',
    disable: 'Отключить субтитры',
  },
  pip: {
    enter: 'Картинка в картинке',
    exit: 'Закрыть картинку в картинке',
  },
  live: {
    playing: 'Прямой эфир',
    seekToEdge: 'Перейти к прямому эфиру',
    badge: 'Прямой эфир',
  },
  cast: {
    start: 'Начать трансляцию',
    stop: 'Остановить трансляцию',
    connecting: 'Подключение',
  },
  airplay: {
    start: 'Запустить AirPlay',
    stop: 'Остановить AirPlay',
  },
  slider: {
    seek: 'Перемотка',
  },
  time: {
    current: 'Текущее время',
    duration: 'Продолжительность',
    remaining: 'Оставшееся время',
    remainingSuffix: 'Осталось {duration}',
    showElapsed: '{duration}. Показать прошедшее время.',
    showDuration: '{duration}. Показать длительность.',
    showRemaining: '{duration}. Показать оставшееся время.',
    position: '{current} из {duration}',
  },
  playback: {
    rate: 'Скорость воспроизведения {rate}',
  },
  volume: {
    mutedValue: '{percent}, без звука',
    muted: 'Без звука',
    label: 'Громкость',
    value: 'Громкость {value}',
  },
  status: {
    captionsOn: 'Субтитры включены',
    captionsOff: 'Субтитры выключены',
    paused: 'На паузе',
    playing: 'Воспроизведение',
    fullscreen: 'Полноэкранный режим',
    pip: 'Картинка в картинке',
    exitPip: 'Выйти из режима «картинка в картинке»',
  },
  errors: {
    aborted: 'Вы прервали воспроизведение видео',
    network: 'Ошибка сети вызвала сбой во время загрузки.',
    decode:
      'Воспроизведение прервано из-за повреждения либо в связи с тем, что видео использует функции, неподдерживаемые вашим браузером.',
    source: 'Не удалось загрузить видео из-за сетевого или серверного сбоя либо неподдерживаемого формата видео.',
    encrypted: 'Видео зашифровано, а у нас нет ключей для его расшифровки.',
    title: 'Что-то пошло не так.',
    unexpected: 'Произошла ошибка. Попробуйте снова.',
  },
  common: {
    empty: '',
    ok: 'Закрыть',
  },
  menu: {
    settings: 'Настройки',
    quality: 'Качество',
    audio: 'Аудио',
    default: 'По умолчанию',
    speed: 'Скорость',
    captions: 'Субтитры',
    playbackRate: 'Скорость воспроизведения',
    back: 'Назад',
    off: 'Выкл.',
    auto: 'Авто',
    autoWithLabel: 'Авто ({label})',
    subtitles: 'Субтитры',
  },
} as const satisfies Translations;

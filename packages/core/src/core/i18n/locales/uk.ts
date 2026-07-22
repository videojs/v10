import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Відтворити',
    pause: 'Призупинити',
    replay: 'Відтворити знову',
    mute: 'Без звуку',
    unmute: 'Зі звуком',
  },
  seek: {
    forward: 'Перемотати вперед на {seconds} с',
    backward: 'Перемотати назад на {seconds} с',
  },
  fullscreen: {
    enter: 'Повноекранний режим',
    exit: 'Вийти з повноекранного режиму',
  },
  captions: {
    enable: 'Увімкнути субтитри',
    disable: 'Вимкнути субтитри',
  },
  pip: {
    enter: 'Зображення в зображенні',
    exit: 'Вийти із режиму зображення в зображенні',
  },
  live: {
    playing: 'Прямий ефір',
    seekToEdge: 'Перейти до прямого ефіру',
    badge: 'На живо',
  },
  cast: {
    start: 'Почати трансляцію',
    stop: 'Зупинити трансляцію',
    connecting: 'Підключення',
  },
  airplay: {
    start: 'Запустити AirPlay',
    stop: 'Зупинити AirPlay',
  },
  slider: {
    seek: 'Перемотка',
  },
  time: {
    current: 'Поточний час',
    duration: 'Тривалість',
    remaining: 'Час, що залишився',
    remainingSuffix: 'Залишилось {duration}',
    showElapsed: '{duration}. Показати минулий час.',
    showDuration: '{duration}. Показати тривалість.',
    showRemaining: '{duration}. Показати час, що залишився.',
    position: '{current} з {duration}',
  },
  playback: {
    rate: 'Швидкість відтворення {rate}',
  },
  volume: {
    mutedValue: '{percent}, вимкнено',
    muted: 'Вимкнено',
    label: 'Гучність',
    value: 'Гучність {value}',
  },
  status: {
    captionsOn: 'Підписи увімкнено',
    captionsOff: 'Підписи вимкнено',
    paused: 'На паузі',
    playing: 'Відтворення',
    fullscreen: 'Повноекранний режим',
    pip: 'Зображення в зображенні',
    exitPip: 'Вийти із режиму зображення в зображенні',
  },
  errors: {
    aborted: 'Ви припинили відтворення відео',
    network: 'Помилка мережі викликала збій під час завантаження відео.',
    decode:
      "Відтворення відео було припинено через пошкодження або у зв'язку з тим, що відео використовує функції, які не підтримуються вашим браузером.",
    source: 'Неможливо завантажити відео через мережевий чи серверний збій або формат не підтримується.',
    encrypted: 'Відео в зашифрованому вигляді, і ми не маємо ключі для розшифровки.',
    title: 'Щось пішло не так.',
    unexpected: 'Сталася помилка. Будь ласка, спробуйте ще раз.',
  },
  common: {
    empty: '',
    ok: 'Закрити',
  },
  menu: {
    settings: 'Налаштування',
    quality: 'Якість',
    audio: 'Аудіо',
    default: 'За замовчуванням',
    speed: 'Швидкість',
    captions: 'Субтитри',
    playbackRate: 'Швидкість відтворення',
    back: 'Назад',
    off: 'Вимкнено',
    auto: 'Авто',
    autoWithLabel: 'Авто ({label})',
    subtitles: 'Субтитри',
  },
} as const satisfies Translations;

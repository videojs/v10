import type { Translations } from '../params';

export default {
  buttons: {
    play: 'پخش',
    pause: 'توقف',
    replay: 'پخش مجدد',
    mute: 'بی‌صدا',
    unmute: 'صدادار',
  },
  seek: {
    forward: '{seconds} ثانیه بعد',
    backward: '{seconds} ثانیه قبل',
  },
  fullscreen: {
    enter: 'تمام‌صفحه',
    exit: 'خروج از تمام‌صفحه',
  },
  captions: {
    enable: 'فعال‌سازی زیرنویس',
    disable: 'غیرفعال‌سازی زیرنویس',
  },
  pip: {
    enter: 'تصویر در تصویر',
    exit: 'خروج از حالت تصویر در تصویر',
  },
  live: {
    playing: 'پخش زنده',
    seekToEdge: 'رفتن به پخش زنده',
    badge: 'زنده',
  },
  cast: {
    start: 'شروع پخش به تلویزیون',
    stop: 'توقف پخش به تلویزیون',
    connecting: 'در حال اتصال',
  },
  airplay: {
    start: 'شروع AirPlay',
    stop: 'توقف AirPlay',
  },
  slider: {
    seek: 'جستجو',
  },
  time: {
    current: 'زمان فعلی',
    duration: 'مدت',
    remaining: 'زمان باقی‌مانده',
    remainingSuffix: '{duration} باقی‌مانده',
    showElapsed: '{duration}. نمایش زمان سپری‌شده.',
    showDuration: '{duration}. نمایش مدت.',
    showRemaining: '{duration}. نمایش زمان باقی‌مانده.',
    position: '{current} از {duration}',
  },
  playback: {
    rate: 'سرعت پخش {rate}',
  },
  volume: {
    mutedValue: '{percent}, بی‌صدا',
    muted: 'بی‌صدا',
    label: 'صدا',
    value: 'صدا {value}',
  },
  status: {
    captionsOn: 'توضیحات روشن',
    captionsOff: 'توضیحات خاموش',
    paused: 'متوقف شده',
    playing: 'در حال پخش',
    fullscreen: 'تمام‌صفحه',
    pip: 'تصویر در تصویر',
    exitPip: 'خروج از حالت تصویر در تصویر',
  },
  errors: {
    aborted: 'شما پخش رسانه را قطع نمودید',
    network: 'وقوع مشکلی در شبکه باعث اختلال در دانلود رسانه شد.',
    decode: 'پخش رسانه به‌علت اشکال در آن یا عدم پشتیبانی مرورگر شما قطع شد.',
    source:
      'رسانه قابل بارگیری نیست. ممکن است مشکلی در شبکه یا سرور رخ داده باشد یا قالب رسانه در دستگاه شما پشتیبانی نشود.',
    encrypted: 'این رسانه رمزنگاری شده‌است و کلیدهای رمزگشایی آن موجود نیست.',
    title: 'مشکلی پیش آمد.',
    unexpected: 'خطایی رخ داد. لطفاً دوباره امتحان کنید.',
  },
  common: {
    empty: '',
    ok: 'بستن',
  },
  menu: {
    settings: 'تنظیمات',
    quality: 'کیفیت',
    audio: 'صدا',
    default: 'پیش‌فرض',
    speed: 'سرعت',
    captions: 'زیرنویس‌ها',
    playbackRate: 'سرعت پخش',
    back: 'بازگشت',
    off: 'خاموش',
    auto: 'خودکار',
    autoWithLabel: 'خودکار ({label})',
    subtitles: 'زیرنویس‌ها',
  },
} as const satisfies Translations;

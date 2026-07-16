import type { Translations } from '../params';

export default {
  buttons: {
    play: 'تشغيل',
    pause: 'إيقاف',
    replay: 'إعادة التشغيل',
    mute: 'كتم',
    unmute: 'إلغاء الكتم',
  },
  seek: {
    forward: 'التخطي للأمام {seconds}',
    backward: 'الرجوع للخلف {seconds}',
  },
  fullscreen: {
    enter: 'ملء الشاشة',
    exit: 'الخروج من ملء الشاشة',
  },
  captions: {
    enable: 'تفعيل التسميات التوضيحية',
    disable: 'إيقاف التسميات التوضيحية',
  },
  pip: {
    enter: 'صورة داخل صورة',
    exit: 'الخروج من وضع صورة داخل صورة',
  },
  live: {
    playing: 'بث مباشر',
    seekToEdge: 'الانتقال إلى البث المباشر',
    badge: 'مباشر',
  },
  cast: {
    start: 'بدء الإرسال',
    stop: 'إيقاف الإرسال',
    connecting: 'جارٍ الاتصال',
  },
  airplay: {
    start: 'بدء AirPlay',
    stop: 'إيقاف AirPlay',
  },
  slider: {
    seek: 'تقديم',
  },
  time: {
    current: 'الوقت الحالي',
    duration: 'المدة',
    remaining: 'الوقت المتبقي',
    remainingSuffix: 'متبقٍ {duration}',
    showElapsed: '{duration}. عرض الوقت المنقضي.',
    showDuration: '{duration}. عرض المدة.',
    showRemaining: '{duration}. عرض الوقت المتبقي.',
    position: '{current} من {duration}',
  },
  playback: {
    rate: 'سرعة التشغيل {rate}',
  },
  volume: {
    mutedValue: '{percent}، مكتوم',
    muted: 'صامت',
    label: 'مستوى الصوت',
    value: 'مستوى الصوت {value}',
  },
  status: {
    captionsOn: 'الترجمة مفعّلة',
    captionsOff: 'الترجمة متوقفة',
    paused: 'متوقف مؤقتاً',
    playing: 'قيد التشغيل',
    fullscreen: 'ملء الشاشة',
    pip: 'صورة داخل صورة',
    exitPip: 'الخروج من صورة داخل صورة',
  },
  errors: {
    aborted: 'لقد ألغيت تشغيل الفيديو',
    network: 'تسبب خطأ في الشبكة بفشل تحميل الفيديو بالكامل.',
    decode: 'تم إيقاف تشغيل الفيديو بسبب عدم صلاحية الفيديو أو لأن الفيديو المستخدم يستخدم ميزات غير مدعومة من متصفحك.',
    source: 'لا يمكن تحميل الفيديو بسبب فشل في الخادم أو الشبكة ، أو بسبب عدم إمكانية قراءة تنسيق الفيديو.',
    encrypted: 'الوسائط مشفرة وليس لدينا الرموز اللازمة لفك شفرتها.',
    title: 'حدث خطأ ما.',
    unexpected: 'حدث خطأ. يُرجى المحاولة مرة أخرى.',
  },
  common: {
    empty: '',
    ok: 'أغلق',
  },
  menu: {
    settings: 'الإعدادات',
    quality: 'الجودة',
    audio: 'الصوت',
    default: 'افتراضي',
    speed: 'السرعة',
    captions: 'التسميات التوضيحية',
    playbackRate: 'سرعة التشغيل',
    back: 'رجوع',
    off: 'إيقاف',
    auto: 'تلقائي',
    autoWithLabel: 'تلقائي ({label})',
    subtitles: 'الترجمة',
  },
} as const satisfies Translations;

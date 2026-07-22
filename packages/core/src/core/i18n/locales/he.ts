import type { Translations } from '../params';

export default {
  buttons: {
    play: 'נַגֵּן',
    pause: 'השהה',
    replay: 'נַגֵּן שוב',
    mute: 'השתק',
    unmute: 'בטל השתקה',
  },
  seek: {
    forward: 'דילוג קדימה {seconds} שניות',
    backward: 'דילוג אחורה {seconds} שניות',
  },
  fullscreen: {
    enter: 'מסך מלא',
    exit: 'יציאה ממסך מלא',
  },
  captions: {
    enable: 'הפעל כתוביות',
    disable: 'כבה כתוביות',
  },
  pip: {
    enter: 'תמונה בתוך תמונה',
    exit: 'יציאה מתמונה בתוך תמונה',
  },
  live: {
    playing: 'משדר חי',
    seekToEdge: 'עבור לשידור חי',
    badge: 'שידור חי',
  },
  cast: {
    start: 'התחל שידור',
    stop: 'עצור שידור',
    connecting: 'מתחבר',
  },
  airplay: {
    start: 'הפעלת AirPlay',
    stop: 'עצירת AirPlay',
  },
  slider: {
    seek: 'חיפוש',
  },
  time: {
    current: 'זמן נוכחי',
    duration: 'זמן כולל',
    remaining: 'זמן נותר',
    remainingSuffix: 'נותרו {duration}',
    showElapsed: '{duration}. הצג זמן שחלף.',
    showDuration: '{duration}. הצג משך.',
    showRemaining: '{duration}. הצג זמן שנותר.',
    position: '{current} מתוך {duration}',
  },
  playback: {
    rate: 'קצב ניגון {rate}',
  },
  volume: {
    mutedValue: '{percent}, מושתק',
    muted: 'מושתק',
    label: 'עוצמת קול',
    value: 'עוצמת קול {value}',
  },
  status: {
    captionsOn: 'כיתובים פועלים',
    captionsOff: 'כיתובים כבויים',
    paused: 'מושהה',
    playing: 'מתנגן',
    fullscreen: 'מסך מלא',
    pip: 'תמונה בתוך תמונה',
    exitPip: 'יציאה מתמונה בתוך תמונה',
  },
  errors: {
    aborted: 'ביטלת את השמעת המדיה',
    network: 'שגיאת רשת גרמה להורדת המדיה להיכשל באמצע.',
    decode: 'השמעת המדיה בוטלה בשל בעית השחטת מידע או מכיוון שהמדיה עשתה שימוש בתכונות שהדפדפן שלך לא תמך בהן.',
    source: 'לא ניתן לטעון את המדיה, או מכיוון שהרשת או השרת כשלו או מכיוון שהפורמט אינו נתמך.',
    encrypted: 'המדיה מוצפנת ואין בידינו את המפתח כדי לפענח אותה.',
    title: 'אירעה שגיאה.',
    unexpected: 'אירעה שגיאה. אנא נסה שוב.',
  },
  common: {
    empty: '',
    ok: 'סְגוֹר',
  },
  menu: {
    settings: 'הגדרות',
    quality: 'איכות',
    audio: 'שמע',
    default: 'ברירת מחדל',
    speed: 'מהירות',
    captions: 'כתוביות',
    playbackRate: 'קצב ניגון',
    back: 'חזרה',
    off: 'כבוי',
    auto: 'אוטומטי',
    autoWithLabel: 'אוטומטי ({label})',
    subtitles: 'כתוביות',
  },
} as const satisfies Translations;

import type { Translations } from '../params';

export default {
  buttons: {
    play: 'चलाउनु',
    pause: 'रोक्नु',
    replay: 'फेरि चलाउनु',
    mute: 'म्यूट गर्नुहोस्',
    unmute: 'अनम्यूट गर्नुहोस्',
  },
  seek: {
    forward: '{seconds} सेकेन्ड अगाडि सार्नुहोस्',
    backward: '{seconds} सेकेन्ड पछाडि सार्नुहोस्',
  },
  fullscreen: {
    enter: 'पूर्ण स्क्रिन',
    exit: 'पूर्ण स्क्रिनबाट बाहिर',
  },
  captions: {
    enable: 'क्याप्शन',
    disable: 'क्याप्शन बंद',
  },
  pip: {
    enter: 'पिक्चर-इन-पिक्चर',
    exit: 'पिक्चर-इन-पिक्चरबाट बाहिर निस्कनुहोस्',
  },
  live: {
    playing: 'लाइभ चलिरहेको छ',
    seekToEdge: 'लाइभमा जानुहोस्',
    badge: 'लाइव',
  },
  cast: {
    start: 'कास्टिंग सुरू गर्नुहोस्',
    stop: 'कास्टिंग रोक्नुहोस्',
    connecting: 'जडान हुँदैछ',
  },
  airplay: {
    start: 'AirPlay सुरु गर्नुहोस्',
    stop: 'AirPlay रोक्नुहोस्',
  },
  slider: {
    seek: 'खोज',
  },
  time: {
    current: 'हालको समय',
    duration: 'अवधि',
    remaining: 'बाँकी समय',
    remainingSuffix: '{duration} बाँकी',
    showElapsed: '{duration}. बितेको समय देखाउनुहोस्.',
    showDuration: '{duration}. अवधि देखाउनुहोस्.',
    showRemaining: '{duration}. बाँकी समय देखाउनुहोस्.',
    position: '{duration} मध्ये {current}',
  },
  playback: {
    rate: 'प्लेब्याक दर {rate}',
  },
  volume: {
    mutedValue: '{percent}, म्यूट',
    muted: 'म्यूट',
    label: 'भोल्युम',
    value: 'भोल्युम {value}',
  },
  status: {
    captionsOn: 'क्याप्शन चालू',
    captionsOff: 'क्याप्शन बंद',
    paused: 'रोकिएको',
    playing: 'चलिरहेको',
    fullscreen: 'पूर्ण स्क्रिन',
    pip: 'पिक्चर इन पिक्चर',
    exitPip: 'पिक्चर इन पिक्चरबाट बाहिर',
  },
  errors: {
    aborted: 'तपाईंले मिडिया प्लेब्याक रद्द गर्नुभयो',
    network: 'नेटवर्क त्रुटिले मिडिया डाउनलोडलाई आधा मार्गमा असफल गर्यो।',
    decode: 'मिडिया प्लेब्याक अवरुद्ध गरियो, कारण मिडिया दूषित भयो वा तपाईंको ब्राउजरले समर्थन नगरेको सुविधाहरू प्रयोग गर्यो।',
    source: 'मिडिया लोड गर्न सकिएन, नेटवर्क वा सर्भर विफल भयो वा त्यसको प्रारूप समर्थित छैन।',
    encrypted: 'मिडिया एन्क्रिप्ट गरिएको छ र हामीसँग डिक्रिप्ट गर्ने कुञ्जीहरू छैनन्।',
    title: 'केही गलत भयो।',
    unexpected: 'एउटा त्रुटि भयो। कृपया पुन: प्रयास गर्नुहोस्।',
  },
  common: {
    empty: '',
    ok: 'बन्द गर्नुहोस्',
  },
  menu: {
    settings: 'सेटिङहरू',
    quality: 'गुणस्तर',
    audio: 'अडियो',
    default: 'पूर्वनिर्धारित',
    speed: 'गति',
    captions: 'क्याप्शन',
    playbackRate: 'प्लेब्याक दर',
    back: 'पछाडि',
    off: 'बन्द',
    auto: 'स्वतः',
    autoWithLabel: 'स्वतः ({label})',
    subtitles: 'उपशीर्षक',
  },
} as const satisfies Translations;

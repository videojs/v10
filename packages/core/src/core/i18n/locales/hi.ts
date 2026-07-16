import type { Translations } from '../params';

export default {
  buttons: {
    play: 'चलाएँ',
    pause: 'रोकें',
    replay: 'फिर से चलाएँ',
    mute: 'म्यूट करें',
    unmute: 'अनम्यूट करें',
  },
  seek: {
    forward: '{seconds} सेकंड आगे बढ़ें',
    backward: '{seconds} सेकंड पीछे जाएं',
  },
  fullscreen: {
    enter: 'फ़ुल स्क्रीन',
    exit: 'पूर्ण स्क्रीन से बाहर',
  },
  captions: {
    enable: 'कैप्शन चालू करें',
    disable: 'कैप्शन बंद करें',
  },
  pip: {
    enter: 'पिक्चर-इन-पिक्चर',
    exit: 'पिक्चर-इन-पिक्चर से बाहर निकलें',
  },
  live: {
    playing: 'लाइव चल रहा है',
    seekToEdge: 'लाइव पर जाएँ',
    badge: 'लाइव',
  },
  cast: {
    start: 'कास्टिंग शुरू करें',
    stop: 'कास्टिंग बंद करें',
    connecting: 'कनेक्ट हो रहा है',
  },
  airplay: {
    start: 'AirPlay शुरू करें',
    stop: 'AirPlay रोकें',
  },
  slider: {
    seek: 'खोजें',
  },
  time: {
    current: 'वर्तमान समय',
    duration: 'अवधि',
    remaining: 'शेष समय',
    remainingSuffix: '{duration} शेष',
    showElapsed: '{duration}. बीता समय दिखाएँ.',
    showDuration: '{duration}. अवधि दिखाएँ.',
    showRemaining: '{duration}. शेष समय दिखाएँ.',
    position: '{duration} में से {current}',
  },
  playback: {
    rate: 'चलाने की दर {rate}',
  },
  volume: {
    mutedValue: '{percent}, म्यूट',
    muted: 'म्यूट',
    label: 'वॉल्यूम',
    value: 'वॉल्यूम {value}',
  },
  status: {
    captionsOn: 'कैप्शन चालू',
    captionsOff: 'कैप्शन बंद',
    paused: 'रोका गया',
    playing: 'चल रहा है',
    fullscreen: 'पूर्ण स्क्रीन',
    pip: 'पिक्चर में पिक्चर',
    exitPip: 'पिक्चर में पिक्चर से बाहर',
  },
  errors: {
    aborted: 'आपने मीडिया प्लेबैक को रोक दिया',
    network: 'एक नेटवर्क त्रुटि के कारण मीडिया डाउनलोड आंशिक रूप से विफल हो गया।',
    decode:
      'मीडिया प्लेबैक निरस्त कर दिया गया, कारण: दूषण की समस्या या मीडिया ने उन सुविधाओं का उपयोग किया था जिनका आपके ब्राउज़र ने समर्थन नहीं किया।',
    source: 'मीडिया लोड नहीं किया जा सका, या तो सर्वर या नेटवर्क विफल होने के कारण या प्रारूप समर्थित नहीं होने के कारण।',
    encrypted: 'मीडिया एन्क्रिप्टेड है और हमारे पास इसे डिक्रिप्ट करने की चाबी नहीं है।',
    title: 'कुछ गलत हुआ।',
    unexpected: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
  },
  common: {
    empty: '',
    ok: 'बंद करें',
  },
  menu: {
    settings: 'सेटिंग्स',
    quality: 'गुणवत्ता',
    audio: 'ऑडियो',
    default: 'डिफ़ॉल्ट',
    speed: 'गति',
    captions: 'कैप्शन',
    playbackRate: 'प्लेबैक दर',
    back: 'वापस',
    off: 'बंद',
    auto: 'ऑटो',
    autoWithLabel: 'ऑटो ({label})',
    subtitles: 'उपशीर्षक',
  },
} as const satisfies Translations;

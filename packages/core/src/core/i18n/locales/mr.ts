import type { Translations } from '../params';

export default {
  buttons: {
    play: 'वाजवा',
    pause: 'थांबा',
    replay: 'पुन्हा वाजवा',
    mute: 'म्यूट करा',
    unmute: 'अनम्यूट करा',
  },
  seek: {
    forward: 'पुढे जा {seconds} सेकंद',
    backward: 'मागे जा {seconds} सेकंद',
  },
  fullscreen: {
    enter: 'संपूर्ण पडदा',
    exit: 'संपूर्ण पडद्यातून बाहेर',
  },
  captions: {
    enable: 'मथळे',
    disable: 'मथळे बंद',
  },
  pip: {
    enter: 'पिक्चर-इन-पिक्चर',
    exit: 'पिक्चर-इन-पिक्चरमधून बाहेर पडा',
  },
  live: {
    playing: 'थेट प्रसारण सुरू आहे',
    seekToEdge: 'थेट प्रसारणाकडे जा',
    badge: 'थेट प्रसारण',
  },
  cast: {
    start: 'कास्टिंग सुरू करा',
    stop: 'कास्टिंग थांबवा',
    connecting: 'कनेक्ट होत आहे',
  },
  airplay: {
    start: 'AirPlay सुरू करा',
    stop: 'AirPlay थांबवा',
  },
  slider: {
    seek: 'शोध',
  },
  time: {
    current: 'वर्तमान वेळ',
    duration: 'कालावधी',
    remaining: 'उर्वरित वेळ',
    remainingSuffix: '{duration} उर्वरित',
    showElapsed: '{duration}. गेलेला वेळ दाखवा.',
    showDuration: '{duration}. कालावधी दाखवा.',
    showRemaining: '{duration}. उरलेला वेळ दाखवा.',
    position: '{duration} पैकी {current}',
  },
  playback: {
    rate: 'प्लेबॅक दर {rate}',
  },
  volume: {
    mutedValue: '{percent}, म्यूट केलेले',
    muted: 'म्यूट केलेले',
    label: 'आवाज',
    value: 'आवाज {value}',
  },
  status: {
    captionsOn: 'मथळे चालू',
    captionsOff: 'मथळे बंद',
    paused: 'थांबलेले',
    playing: 'वाजत आहे',
    fullscreen: 'संपूर्ण पडदा',
    pip: 'पिक्चरमध्ये पिक्चर',
    exitPip: 'पिक्चरमध्ये पिक्चरमधून बाहेर',
  },
  errors: {
    aborted: 'तुम्ही मीडिया प्लेबॅक रद्द केला',
    network: 'नेटवर्क त्रुटीमुळे मीडिया डाउनलोड अर्ध्यात अयशस्वी झाला.',
    decode:
      'मीडिया प्लेबॅक भ्रष्टाचाराच्या समस्येमुळे किंवा मीडियाने वापरलेल्या वैशिष्ट्यांमुळे तुमचा ब्राउझर सपोर्ट करत नसल्यामुळे रद्द करण्यात आला.',
    source: 'मीडिया लोड करता आला नाही, एकतर सर्व्हर किंवा नेटवर्क अयशस्वी झाल्यामुळे किंवा फॉरमॅट समर्थित नसल्यामुळे.',
    encrypted: 'मीडिया एन्क्रिप्ट केलेला आहे आणि तो डिक्रिप्ट करण्यासाठी आमच्याकडे कळा नाहीत.',
    title: 'काहीतरी चुकले.',
    unexpected: 'एक त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
  },
  common: {
    empty: '',
    ok: 'बंद',
  },
  menu: {
    settings: 'सेटिंग्ज',
    quality: 'गुणवत्ता',
    audio: 'ऑडिओ',
    default: 'डीफॉल्ट',
    speed: 'गती',
    captions: 'मथळे',
    playbackRate: 'प्लेबॅक दर',
    back: 'मागे',
    off: 'बंद',
    auto: 'स्वयंचलित',
    autoWithLabel: 'स्वयंचलित ({label})',
    subtitles: 'उपशीर्षके',
  },
} as const satisfies Translations;

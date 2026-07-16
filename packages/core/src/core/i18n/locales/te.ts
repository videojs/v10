import type { Translations } from '../params';

export default {
  buttons: {
    play: 'ప్లే',
    pause: 'పాజ్',
    replay: 'రీప్లే',
    mute: 'మ్యూట్',
    unmute: 'అన్మ్యూట్ చేయండి',
  },
  seek: {
    forward: '{seconds} సెకన్లు ముందుకు',
    backward: '{seconds} సెకన్లు వెనుకకు',
  },
  fullscreen: {
    enter: 'పూర్తి స్క్రీన్',
    exit: 'పూర్తి స్క్రీన్ నుండి నిష్క్రమించండి',
  },
  captions: {
    enable: 'శీర్షికలు',
    disable: 'శీర్షికలు ఆఫ్ చేయండి',
  },
  pip: {
    enter: 'పిక్చర్-ఇన్-పిక్చర్',
    exit: 'పిక్చర్-ఇన్-పిక్చర్ నుండి నిష్క్రమించండి',
  },
  live: {
    playing: 'లైవ్‌లో ప్లే అవుతోంది',
    seekToEdge: 'లైవ్‌కు వెళ్లండి',
    badge: 'లైవ్',
  },
  cast: {
    start: 'కాస్టింగ్ ప్రారంభించండి',
    stop: 'కాస్టింగ్ ఆపండి',
    connecting: 'కనెక్ట్ అవుతోంది',
  },
  airplay: {
    start: 'AirPlay ప్రారంభించండి',
    stop: 'AirPlay ఆపండి',
  },
  slider: {
    seek: 'శోధించు',
  },
  time: {
    current: 'ప్రస్తుత సమయం',
    duration: 'వ్యవధి',
    remaining: 'మిగిలిన సమయం',
    remainingSuffix: '{duration} మిగిలి',
    showElapsed: '{duration}. గడిచిన సమయం చూపు.',
    showDuration: '{duration}. వ్యవధి చూపు.',
    showRemaining: '{duration}. మిగిలిన సమయం చూపు.',
    position: '{current} యొక్క {duration}',
  },
  playback: {
    rate: 'ప్లేబ్యాక్ రేట్ {rate}',
  },
  volume: {
    mutedValue: '{percent}, మ్యూట్ చేయబడింది',
    muted: 'మ్యూట్ చేయబడింది',
    label: 'వాల్యూమ్',
    value: 'వాల్యూమ్ {value}',
  },
  status: {
    captionsOn: 'శీర్షికలు ఆన్',
    captionsOff: 'శీర్షికలు ఆఫ్',
    paused: 'పాజ్ చేయబడింది',
    playing: 'ప్లే అవుతోంది',
    fullscreen: 'పూర్తి స్క్రీన్',
    pip: 'పిక్చర్ ఇన్ పిక్చర్',
    exitPip: 'పిక్చర్ ఇన్ పిక్చర్ నుండి నిష్క్రమించండి',
  },
  errors: {
    aborted: 'మీరు మీడియా ప్లేబ్యాక్‌ను రద్దు చేశారు',
    network: 'నెట్‌వర్క్ లోపం వలన మీడియా డౌన్‌లోడ్ విఫలమైంది.',
    decode: 'అవినీతి సమస్య కారణంగా లేదా మీ బ్రౌజర్ మద్దతు ఇవ్వని లక్షణాలను మీడియా ఉపయోగించినందున మీడియా ప్లేబ్యాక్ నిలిపివేయబడింది.',
    source: 'సర్వర్ లేదా నెట్‌వర్క్ విఫలమైనందున లేదా ఫార్మాట్‌కు మద్దతు లేనందున మీడియాను లోడ్ చేయడం సాధ్యం కాలేదు.',
    encrypted: 'మీడియా గుప్తీకరించబడింది మరియు దానిని డీక్రిప్ట్ చేయడానికి మాకు కీలు లేవు.',
    title: 'ఏదో తప్పు జరిగింది.',
    unexpected: 'ఒక లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  },
  common: {
    empty: '',
    ok: 'మూసివేయండి',
  },
  menu: {
    settings: 'సెట్టింగ్‌లు',
    quality: 'నాణ్యత',
    audio: 'ఆడియో',
    default: 'డిఫాల్ట్',
    speed: 'వేగం',
    captions: 'శీర్షికలు',
    playbackRate: 'ప్లేబ్యాక్ రేట్',
    back: 'వెనుకకు',
    off: 'ఆఫ్',
    auto: 'ఆటో',
    autoWithLabel: 'ఆటో ({label})',
    subtitles: 'ఉపశీర్షికలు',
  },
} as const satisfies Translations;

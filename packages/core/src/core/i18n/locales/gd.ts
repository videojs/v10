import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Cluich',
    pause: 'Cuir ’na stad',
    replay: 'Cluich a-rithist',
    mute: 'Mùch',
    unmute: 'Dì-mhùch',
  },
  seek: {
    forward: 'Gluais air adhart {seconds} diog',
    backward: 'Gluais air ais {seconds} diog',
  },
  fullscreen: {
    enter: 'Làn-sgrìn',
    exit: 'Fàg làn-sgrìn',
  },
  captions: {
    enable: 'Cuir capsaidean air',
    disable: 'Toir capsaidean dheth',
  },
  pip: {
    enter: 'Dealbh beag anns a’ dealbh mhòr',
    exit: 'Fàg dealbh beag anns a’ dealbh mhòr',
  },
  live: {
    playing: 'A’ cluich beò',
    seekToEdge: 'Tèarmann gu beò',
    badge: 'Beò',
  },
  cast: {
    start: 'Tòisich air tar-chur',
    stop: 'Cuir stad air tar-chur',
    connecting: 'A’ ceangal',
  },
  airplay: {
    start: 'Tòisich AirPlay',
    stop: 'Cuir stad air AirPlay',
  },
  slider: {
    seek: 'Lorg',
  },
  time: {
    current: 'An ùine làithreach',
    duration: 'Faide',
    remaining: 'An ùine air fhàgail',
    remainingSuffix: '{duration} air fhàgail',
    showElapsed: '{duration}. Seall an ùine a chaidh seachad.',
    showDuration: '{duration}. Seall an ùine iomlan.',
    showRemaining: '{duration}. Seall an ùine air fhàgail.',
    position: '{current} à {duration}',
  },
  playback: {
    rate: 'Reat cluich {rate}',
  },
  volume: {
    mutedValue: '{percent}, air mùchadh',
    muted: 'Air mùchadh',
    label: 'Àirde na fuaime',
    value: 'Àirde na fuaime {value}',
  },
  status: {
    captionsOn: 'Caipseanan air',
    captionsOff: 'Caipseanan dheth',
    paused: 'Air stad',
    playing: 'A’ cluich',
    fullscreen: 'Làn-sgrìn',
    pip: 'Dealbh beag anns a’ dealbh mhòr',
    exitPip: 'Fàg dealbh beag',
  },
  errors: {
    aborted: 'Sguir thu de chluich a’ mheadhain',
    network: 'Cha deach leinn an còrr dhen mheadhan a luchdadh a-nuas ri linn mearachd lìonraidh.',
    decode:
      'Sguir sinn de chluich a’ mheadhain – dh’fhaoidte gu bheil e coirbte no gu bheil gleus aig a’ mheadhan nach cuir am brabhsair taic ris.',
    source:
      'Cha b’ urrainn dhuinn am meadhan a luchdadh – dh’fhaoidte gun do dh’fhàillig leis an fhrithealaiche no an lìonra no nach cuir sinn taic ris an fhòrmat.',
    encrypted: 'Tha am meadhan crioptaichte ’s chan eil iuchair dì-chrioptachaidh againn dha.',
    title: 'Chaidh rudeigin ceàrr.',
    unexpected: 'Thachair mearachd. Feuch ris a-rithist.',
  },
  common: {
    empty: '',
    ok: 'Dùin',
  },
  menu: {
    settings: 'Roghainnean',
    quality: 'Càileachd',
    audio: 'Fuaim',
    default: 'Bunaiteach',
    speed: 'Astar',
    captions: 'Caipseanan',
    playbackRate: 'Reat cluich',
    back: 'Air ais',
    off: 'Dheth',
    auto: 'Fèin-obrachail',
    autoWithLabel: 'Fèin-obrachail ({label})',
    subtitles: 'Fo-thiotalan',
  },
} as const satisfies Translations;

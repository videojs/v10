import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Toista',
    pause: 'Keskeytä toisto',
    replay: 'Toista uudelleen',
    mute: 'Mykistä',
    unmute: 'Poista mykistys',
  },
  seek: {
    forward: 'Hyppää eteenpäin {seconds} sekuntia',
    backward: 'Hyppää taaksepäin {seconds} sekuntia',
  },
  fullscreen: {
    enter: 'Koko näytön tila',
    exit: 'Poistu koko näytöltä',
  },
  captions: {
    enable: 'Ota tekstitykset käyttöön',
    disable: 'Poista tekstitykset käytöstä',
  },
  pip: {
    enter: 'Kuva kuvassa -tila',
    exit: 'Poistu kuva kuvassa -tilasta',
  },
  live: {
    playing: 'Toistetaan livenä',
    seekToEdge: 'Siirry liveen',
    badge: 'Live',
  },
  cast: {
    start: 'Aloita lähetys',
    stop: 'Lopeta lähetys',
    connecting: 'Yhdistetään',
  },
  airplay: {
    start: 'Käynnistä AirPlay',
    stop: 'Pysäytä AirPlay',
  },
  slider: {
    seek: 'Kelaa',
  },
  time: {
    current: 'Tämänhetkinen aika',
    duration: 'Kokonaiskesto',
    remaining: 'Jäljellä oleva aika',
    remainingSuffix: '{duration} jäljellä',
    showElapsed: '{duration}. Näytä kulunut aika.',
    showDuration: '{duration}. Näytä kesto.',
    showRemaining: '{duration}. Näytä jäljellä oleva aika.',
    position: '{current} / {duration}',
  },
  playback: {
    rate: 'Toistonopeus {rate}',
  },
  volume: {
    mutedValue: '{percent}, mykistetty',
    muted: 'Mykistetty',
    label: 'Äänenvoimakkuus',
    value: 'Äänenvoimakkuus {value}',
  },
  status: {
    captionsOn: 'Tekstitys päällä',
    captionsOff: 'Tekstitys pois',
    paused: 'Keskeytetty',
    playing: 'Toistetaan',
    fullscreen: 'Koko näyttö',
    pip: 'Kuva kuvassa',
    exitPip: 'Poistu kuva kuvassa -tilasta',
  },
  errors: {
    aborted: 'Olet keskeyttänyt videotoiston',
    network: 'Verkkovirhe keskeytti videon latauksen.',
    decode:
      'Videon toisto keskeytyi, koska videotiedosto on vioittunut tai käyttää toimintoja, joita selaimesi ei tue.',
    source: 'Videon lataus ei onnistunut joko palvelin- tai verkkovirheestä tai väärästä formaatista johtuen.',
    encrypted: 'Media on salattu eikä siihen ole purkuavaimia.',
    title: 'Jotain meni pieleen.',
    unexpected: 'Tapahtui virhe. Yritä uudelleen.',
  },
  common: {
    empty: '',
    ok: 'OK',
  },
  menu: {
    settings: 'Asetukset',
    quality: 'Laatu',
    audio: 'Ääni',
    default: 'Oletus',
    speed: 'Nopeus',
    captions: 'Tekstitykset',
    playbackRate: 'Toistonopeus',
    back: 'Takaisin',
    off: 'Pois',
    auto: 'Automaattinen',
    autoWithLabel: 'Automaattinen ({label})',
    subtitles: 'Tekstitykset',
  },
} as const satisfies Translations;

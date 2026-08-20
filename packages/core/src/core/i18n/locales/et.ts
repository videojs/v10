import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Esita',
    pause: 'Paus',
    replay: 'Esita uuesti',
    mute: 'Vaigista',
    unmute: 'Lõpeta vaigistus',
  },
  seek: {
    forward: 'Liigu edasi {seconds} sekundit',
    backward: 'Liigu tagasi {seconds} sekundit',
  },
  fullscreen: {
    enter: 'Täisekraan',
    exit: 'Välju täisekraanist',
  },
  captions: {
    enable: 'Lülita subtiitrid sisse',
    disable: 'Lülita subtiitrid välja',
  },
  pip: {
    enter: 'Pilt pildis',
    exit: 'Välju funktsioonist pilt pildis',
  },
  live: {
    playing: 'Mängib reaalajas',
    seekToEdge: 'Mine otseülekande äärele',
    badge: 'Otse',
  },
  cast: {
    start: 'Alusta ülekandmist',
    stop: 'Lõpeta ülekandmine',
    connecting: 'Ühendumine',
  },
  airplay: {
    start: 'Käivita AirPlay',
    stop: 'Peata AirPlay',
  },
  slider: {
    seek: 'Kerimine',
  },
  time: {
    current: 'Praegune aeg',
    duration: 'Kestus',
    remaining: 'Järelejäänud aeg',
    elapsedSuffix: '{duration} möödunud aega',
    durationSuffix: '{duration} kestust',
    remainingSuffix: 'Jäänud {duration}',
    showElapsed: 'Kuva möödunud aeg, {duration}.',
    showDuration: 'Kuva kestus, {duration}.',
    showRemaining: 'Kuva järelejäänud aeg, {duration}.',
    toggleElapsed: 'Lülita möödunud ja järelejäänud aja vahel.',
    toggleDuration: 'Lülita kestuse ja järelejäänud aja vahel.',
    position: '{current} / {duration}',
  },
  playback: {
    rate: 'Taasesituse kiirus {rate}',
  },
  volume: {
    mutedValue: '{percent}, vaigistatud',
    muted: 'Vaigistatud',
    label: 'Helitugevus',
    value: 'Helitugevus {value}',
  },
  status: {
    captionsOn: 'Pealdised sees',
    captionsOff: 'Pealdised väljas',
    paused: 'Pausitud',
    playing: 'Esitamine',
    fullscreen: 'Täisekraan',
    pip: 'Pilt pildis',
    exitPip: 'Välju funktsioonist pilt pildis',
    seekedTo: 'Liigutud ajale {time}',
  },
  container: {
    label: 'Meediumipleier',
  },
  errors: {
    aborted: 'Katkestasid taasesituse',
    network: 'Võrguvea tõttu nurjus meediumifaili allalaadimine poole pealt.',
    decode:
      'Meediumifaili taasesitamine katkestati, kuna fail on rikutud või see kasutab funktsiooni, mida sinu brauser ei toeta.',
    source:
      'Seda meediumifaili ei õnnestunud laadida, kuna serveris või võrgus esines tõrge või kuna vormingut ei toetata.',
    encrypted: 'See meediumifail on krüpteeritud ja meil pole dekrüpteerimiseks vajalikku võtit.',
    unplayable: 'Pleier ei toeta seda meediat.',
    title: 'Midagi läks valesti.',
    unexpected: 'Esines viga. Palun proovige uuesti.',
  },
  common: {
    empty: '',
    ok: 'Sule',
  },
  menu: {
    settings: 'Seaded',
    quality: 'Kvaliteet',
    audio: 'Heli',
    default: 'Vaikimisi',
    speed: 'Kiirus',
    captions: 'Subtiitrid',
    playbackRate: 'Taasesituse kiirus',
    back: 'Tagasi',
    off: 'Väljas',
    auto: 'Automaatne',
    autoWithLabel: 'Automaatne ({label})',
    subtitles: 'Subtiitrid',
  },
} as const satisfies Translations;

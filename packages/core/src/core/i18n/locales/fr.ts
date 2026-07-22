import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Lecture',
    pause: 'Pause',
    replay: 'Revoir',
    mute: 'Mettre en sourdine',
    unmute: 'Activer le son',
  },
  seek: {
    forward: 'Avancer de {seconds} secondes',
    backward: 'Reculer de {seconds} secondes',
  },
  fullscreen: {
    enter: 'Plein écran',
    exit: 'Quitter le plein écran',
  },
  captions: {
    enable: 'Activer les sous-titres',
    disable: 'Désactiver les sous-titres',
  },
  pip: {
    enter: "Image dans l'image",
    exit: "Quitter le mode image dans l'image",
  },
  live: {
    playing: 'Lecture en direct',
    seekToEdge: 'Aller au direct',
    badge: 'En direct',
  },
  cast: {
    start: 'Démarrer la diffusion',
    stop: 'Arrêter la diffusion',
    connecting: 'Connexion',
  },
  airplay: {
    start: 'Démarrer AirPlay',
    stop: 'Arrêter AirPlay',
  },
  slider: {
    seek: 'Barre de lecture',
  },
  time: {
    current: 'Temps actuel',
    duration: 'Durée',
    remaining: 'Temps restant',
    remainingSuffix: 'Il reste {duration}',
    showElapsed: '{duration}. Afficher le temps écoulé.',
    showDuration: '{duration}. Afficher la durée.',
    showRemaining: '{duration}. Afficher le temps restant.',
    position: '{current} de {duration}',
  },
  playback: {
    rate: 'Vitesse de lecture {rate}',
  },
  volume: {
    mutedValue: '{percent}, son coupé',
    muted: 'Son coupé',
    label: 'Niveau de volume',
    value: 'Niveau de volume {value}',
  },
  status: {
    captionsOn: 'Sous-titres activés',
    captionsOff: 'Sous-titres désactivés',
    paused: 'En pause',
    playing: 'Lecture en cours',
    fullscreen: 'Plein écran',
    pip: 'Image dans l’image',
    exitPip: 'Quitter l’image dans l’image',
  },
  errors: {
    aborted: 'Vous avez interrompu la lecture de la vidéo.',
    network: 'Une erreur de réseau a interrompu le téléchargement de la vidéo.',
    decode:
      "La lecture de la vidéo a été interrompue à cause d'un problème de corruption ou parce que la vidéo utilise des fonctionnalités non prises en charge par votre navigateur.",
    source:
      "Cette vidéo n'a pas pu être chargée, soit parce que le serveur ou le réseau a échoué ou parce que le format n'est pas reconnu.",
    encrypted: "Le média est chiffré et nous n'avons pas les clés pour le déchiffrer.",
    title: 'Une erreur s’est produite.',
    unexpected: 'Une erreur s’est produite. Veuillez réessayer.',
  },
  common: {
    empty: '',
    ok: 'Fermer',
  },
  menu: {
    settings: 'Paramètres',
    quality: 'Qualité',
    audio: 'Audio',
    default: 'Par défaut',
    speed: 'Vitesse',
    captions: 'Sous-titres',
    playbackRate: 'Vitesse de lecture',
    back: 'Retour',
    off: 'Désactivé',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Sous-titres',
  },
} as const satisfies Translations;

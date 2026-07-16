import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Reproduzir',
    pause: 'Pausar',
    replay: 'Reiniciar',
    mute: 'Desativar som',
    unmute: 'Ativar som',
  },
  seek: {
    forward: 'Avançar {seconds} segundos',
    backward: 'Recuar {seconds} segundos',
  },
  fullscreen: {
    enter: 'Ecrã inteiro',
    exit: 'Sair de ecrã inteiro',
  },
  captions: {
    enable: 'Ativar legendas',
    disable: 'Desativar legendas',
  },
  pip: {
    enter: 'Imagem em imagem',
    exit: 'Sair de imagem em imagem',
  },
  live: {
    playing: 'A reproduzir em direto',
    seekToEdge: 'Ir para o em direto',
    badge: 'Em direto',
  },
  cast: {
    start: 'Iniciar transmissão',
    stop: 'Parar transmissão',
    connecting: 'A ligar',
  },
  airplay: {
    start: 'Iniciar AirPlay',
    stop: 'Parar AirPlay',
  },
  slider: {
    seek: 'Procurar',
  },
  time: {
    current: 'Tempo Atual',
    duration: 'Duração',
    remaining: 'Tempo Restante',
    remainingSuffix: 'Restam {duration}',
    showElapsed: '{duration}. Mostrar tempo decorrido.',
    showDuration: '{duration}. Mostrar duração.',
    showRemaining: '{duration}. Mostrar tempo restante.',
    position: '{current} de {duration}',
  },
  playback: {
    rate: 'Velocidade de reprodução {rate}',
  },
  volume: {
    mutedValue: '{percent}, sem som',
    muted: 'Sem som',
    label: 'Nível de volume',
    value: 'Nível de volume {value}',
  },
  status: {
    captionsOn: 'Legendas ativas',
    captionsOff: 'Legendas desativadas',
    paused: 'Em pausa',
    playing: 'A reproduzir',
    fullscreen: 'Ecrã inteiro',
    pip: 'Imagem em imagem',
    exitPip: 'Sair de imagem em imagem',
  },
  errors: {
    aborted: 'Parou a reprodução do vídeo.',
    network: 'Um erro na rede fez o vídeo falhar parcialmente.',
    decode:
      'A reprodução foi interrompida por um problema com o vídeo ou porque o formato não é compatível com o seu navegador.',
    source:
      'O vídeo não pode ser carregado, ou porque houve um problema na rede ou no servidor, ou porque o formato do vídeo não é compatível.',
    encrypted: 'O vídeo está encriptado e não há uma chave para o desencriptar.',
    title: 'Algo correu mal.',
    unexpected: 'Ocorreu um erro. Por favor tente novamente.',
  },
  common: {
    empty: '',
    ok: 'Fechar',
  },
  menu: {
    settings: 'Definições',
    quality: 'Qualidade',
    audio: 'Áudio',
    default: 'Predefinição',
    speed: 'Velocidade',
    captions: 'Legendas',
    playbackRate: 'Velocidade de reprodução',
    back: 'Voltar',
    off: 'Desativado',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Legendas',
  },
} as const satisfies Translations;

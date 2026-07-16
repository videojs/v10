import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Tocar',
    pause: 'Pausar',
    replay: 'Tocar novamente',
    mute: 'Mudo',
    unmute: 'Ativar o som',
  },
  seek: {
    forward: 'Avançar {seconds} segundos',
    backward: 'Retroceder {seconds} segundos',
  },
  fullscreen: {
    enter: 'Tela Cheia',
    exit: 'Sair da tela cheia',
  },
  captions: {
    enable: 'Ativar legendas',
    disable: 'Desativar legendas',
  },
  pip: {
    enter: 'Picture-in-Picture',
    exit: 'Sair de Picture-in-Picture',
  },
  live: {
    playing: 'Reproduzindo ao vivo',
    seekToEdge: 'Ir para o ao vivo',
    badge: 'Ao vivo',
  },
  cast: {
    start: 'Iniciar transmissão',
    stop: 'Parar transmissão',
    connecting: 'Conectando',
  },
  airplay: {
    start: 'Iniciar AirPlay',
    stop: 'Parar AirPlay',
  },
  slider: {
    seek: 'Buscar',
  },
  time: {
    current: 'Tempo',
    duration: 'Duração',
    remaining: 'Tempo Restante',
    remainingSuffix: 'Restam {duration}',
    showElapsed: '{duration}. Mostrar tempo decorrido.',
    showDuration: '{duration}. Mostrar duração.',
    showRemaining: '{duration}. Mostrar tempo restante.',
    position: '{current} de {duration}',
  },
  playback: {
    rate: 'Velocidade {rate}',
  },
  volume: {
    mutedValue: '{percent}, silenciado',
    muted: 'Silenciado',
    label: 'Nível de volume',
    value: 'Nível de volume {value}',
  },
  status: {
    captionsOn: 'Legendas ativadas',
    captionsOff: 'Legendas desativadas',
    paused: 'Pausado',
    playing: 'Reproduzindo',
    fullscreen: 'Tela cheia',
    pip: 'Picture-in-picture',
    exitPip: 'Sair do picture-in-picture',
  },
  errors: {
    aborted: 'Você parou a execução do vídeo.',
    network: 'Um erro na rede causou falha durante o download da mídia.',
    decode:
      'A reprodução foi interrompida devido à um problema de mídia corrompida ou porque a mídia utiliza funções que seu navegador não suporta.',
    source: 'A mídia não pode ser carregada, por uma falha de rede ou servidor ou o formato não é suportado.',
    encrypted: 'A mídia está criptografada e não temos as chaves para descriptografar.',
    title: 'Algo deu errado.',
    unexpected: 'Ocorreu um erro. Tente novamente.',
  },
  common: {
    empty: '',
    ok: 'Fechar',
  },
  menu: {
    settings: 'Configurações',
    quality: 'Qualidade',
    audio: 'Áudio',
    default: 'Padrão',
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

import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/media/spotify-audio';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadAudioSkinTag } from '@app/shared/html/skins';
import { onSkinChange } from '@app/shared/sandbox-listener';
import { SPOTIFY_AUDIO_SRC } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const tag = await loadLatest(() => loadAudioSkinTag(state.skin, state.styling));
  if (!tag) return;

  document.getElementById('root')!.innerHTML = html`
    <div class="w-full max-w-xl mx-auto">
      <audio-player>
        <${tag}>
          <!-- Hidden unless it is showing Spotify's own chrome, so it takes no room and needs no size. -->
          <spotify-audio src="${SPOTIFY_AUDIO_SRC}"></spotify-audio>
        </${tag}>
      </audio-player>
    </div>
  `;
}

render();

onSkinChange((skin) => {
  state.skin = skin;
  render();
});

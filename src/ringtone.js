import { loadIframeApi } from './player.js';

const RINGTONE_VIDEO_ID = 'Vk4KK-gh0FM';

// A fun, independent extra — the classic Nokia ringtone, on its own player.
// Deliberately doesn't touch the main player — tapping it doesn't pause
// whatever's already playing.
export function createRingtoneButton(root) {
  root.innerHTML = `
    <button type="button" class="ringtone-btn" aria-label="Play the classic Nokia ringtone">
      <span aria-hidden="true">&#128276;</span>
    </button>
    <div class="ringtone-clip"><div class="ringtone-mount"></div></div>
  `;

  const btn = root.querySelector('.ringtone-btn');
  const mount = root.querySelector('.ringtone-mount');
  let player = null;
  let playing = false;

  // Created eagerly (not on first click) so playVideo() below can run
  // synchronously inside the click handler once tapped — calling it from a
  // promise callback after the tap loses the user-gesture context and silently
  // fails on iOS Safari (known trap; see CLAUDE.md).
  loadIframeApi().then(() => {
    player = new window.YT.Player(mount, {
      videoId: RINGTONE_VIDEO_ID,
      playerVars: { controls: 0, playsinline: 1, origin: window.location.origin },
      events: {
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) stop();
        },
      },
    });
  });

  function stop() {
    playing = false;
    btn.classList.remove('ringtone-btn--playing');
    if (player) player.stopVideo();
  }

  btn.addEventListener('click', () => {
    if (playing) {
      stop();
      return;
    }
    if (!player) return; // iframe API still loading; rare, no real fallback
    playing = true;
    btn.classList.add('ringtone-btn--playing');
    player.seekTo(0, true);
    player.playVideo();
  });
}

import { PLAYLIST } from './playlist.js';

const NEXT_PREV_DEBOUNCE_MS = 250;
const RESTART_THRESHOLD_S = 3;
const MAX_CONSECUTIVE_ERRORS = 3;

// Exported so ringtone.js can reuse it. Cached at module scope: two callers
// invoking this before the script has loaded would otherwise each overwrite
// window.onYouTubeIframeAPIReady, silently dropping whichever one registered
// first (known trap — the global only fires once, on window). Caching the
// in-flight promise means every caller shares the same single registration.
let iframeApiPromise = null;

export function loadIframeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (iframeApiPromise) return iframeApiPromise;
  iframeApiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return iframeApiPromise;
}

export function createPlayer(bus, elementId = 'yt') {
  return loadIframeApi().then(() => new Promise((resolve) => {
    const state = {
      intendedIndex: 0,
      lastRequestedIndex: 0,
      lastAnnouncedIndex: -1,
      lastErroredIndex: -1,
      consecutiveErrors: 0,
      blocked: false,
      debounceTimer: null,
      tickTimer: null,
      pendingReason: 'initial',
      pendingDirection: 'next',
    };

    function startTicking() {
      clearInterval(state.tickTimer);
      state.tickTimer = setInterval(() => {
        bus.dispatchEvent(new CustomEvent('player:tick', {
          detail: { currentTime: yt.getCurrentTime(), duration: yt.getDuration() },
        }));
      }, 250);
    }

    function stopTicking() {
      clearInterval(state.tickTimer);
    }

    function wrapIndex(i) {
      return ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    }

    // Every index change — user press or error skip alike — goes through this
    // one path: compute the new index locally and load that track's id directly.
    // There's no YouTube-side playlist to desync from anymore, which is the
    // whole point (see playlist.js's header comment).
    function changeIndex(delta, reason, { immediate = false } = {}) {
      state.intendedIndex = wrapIndex(state.intendedIndex + delta);
      state.lastRequestedIndex = state.intendedIndex;
      state.pendingReason = reason;
      state.pendingDirection = delta > 0 ? 'next' : 'prev';
      bus.dispatchEvent(new CustomEvent('track:index', { detail: { index: state.intendedIndex } }));
      clearTimeout(state.debounceTimer);
      if (immediate) {
        yt.loadVideoById(PLAYLIST[state.intendedIndex].id);
      } else {
        state.debounceTimer = setTimeout(() => {
          yt.loadVideoById(PLAYLIST[state.intendedIndex].id);
        }, NEXT_PREV_DEBOUNCE_MS);
      }
    }

    function goNext() {
      changeIndex(1, 'user');
    }

    function goPrev() {
      const t = yt.getCurrentTime ? yt.getCurrentTime() : 0;
      if (t > RESTART_THRESHOLD_S) {
        const wasPlaying = yt.getPlayerState() === window.YT.PlayerState.PLAYING;
        yt.seekTo(0, true);
        // seekTo() can leave the player stalled in a paused/buffering state
        // instead of resuming on its own, observed in testing — force it.
        if (wasPlaying) yt.playVideo();
        console.log(`[player] PREV: restarting current track (t=${t.toFixed(1)}s)`);
        return;
      }
      changeIndex(-1, 'user');
    }

    function jumpToIndex(index) {
      if (index < 0 || index >= PLAYLIST.length) return;
      clearTimeout(state.debounceTimer);
      state.pendingReason = 'user';
      state.pendingDirection = index >= state.intendedIndex ? 'next' : 'prev';
      state.intendedIndex = index;
      state.lastRequestedIndex = index;
      bus.dispatchEvent(new CustomEvent('track:index', { detail: { index } }));
      yt.loadVideoById(PLAYLIST[index].id);
    }

    function togglePlayPause() {
      const s = yt.getPlayerState();
      if (s === window.YT.PlayerState.PLAYING) yt.pauseVideo();
      else yt.playVideo();
    }

    function pause() {
      yt.pauseVideo();
    }

    function retry() {
      state.consecutiveErrors = 0;
      state.blocked = false;
      bus.dispatchEvent(new CustomEvent('player:retry'));
      changeIndex(1, 'error-skip', { immediate: true });
    }

    function handleSkip() {
      if (state.blocked) return;
      state.consecutiveErrors += 1;
      if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        state.blocked = true;
        console.error('[player] 3 consecutive errors, stopping (retry required)');
        bus.dispatchEvent(new CustomEvent('player:blocked'));
        return;
      }
      changeIndex(1, 'error-skip', { immediate: true });
    }

    function handleError(e) {
      const code = e.data;
      switch (code) {
        case 101:
        case 150:
        case 100: {
          const reason = code === 100 ? 'removed or private' : 'embedding disabled';
          state.lastErroredIndex = state.intendedIndex;
          console.warn(`[player] error ${code} (${reason}) on "${PLAYLIST[state.intendedIndex].title}", skipping`);
          bus.dispatchEvent(new CustomEvent('player:error', { detail: { code, index: state.intendedIndex } }));
          handleSkip();
          break;
        }
        case 153:
          console.error('[player] error 153: no Referer reached YouTube — not skippable');
          bus.dispatchEvent(new CustomEvent('player:fatal', { detail: { code } }));
          break;
        case 2:
          throw new Error('[player] error 2: bad parameter');
        default:
          console.error('[player] unhandled error code', code);
      }
    }

    function handleStateChange(e) {
      const YTState = window.YT.PlayerState;
      if (e.data === YTState.PLAYING) {
        // A video can flicker through PLAYING right before it errors out. Only
        // clear the strike counter once a genuinely different track reaches
        // PLAYING, so a flicker on the same blocked track can't reset the guard.
        if (state.intendedIndex !== state.lastErroredIndex) {
          state.consecutiveErrors = 0;
        }
        bus.dispatchEvent(new CustomEvent('player:playing'));
        if (state.intendedIndex !== state.lastAnnouncedIndex) {
          const reason = state.pendingReason || 'auto';
          const direction = state.pendingDirection || 'next';
          state.pendingReason = null;
          state.pendingDirection = null;
          state.lastAnnouncedIndex = state.intendedIndex;
          const track = PLAYLIST[state.intendedIndex];
          bus.dispatchEvent(new CustomEvent('track:change', {
            detail: { index: state.intendedIndex, videoId: track.id, title: track.title, artist: track.artist, reason, direction },
          }));
        }
        startTicking();
      } else if (e.data === YTState.ENDED) {
        stopTicking();
        bus.dispatchEvent(new CustomEvent('player:paused'));
        changeIndex(1, null, { immediate: true }); // null reason -> reported as 'auto' (natural advance)
      } else if (e.data === YTState.PAUSED) {
        stopTicking();
        bus.dispatchEvent(new CustomEvent('player:paused'));
      }
    }

    let yt = new window.YT.Player(elementId, {
      videoId: PLAYLIST[0].id,
      playerVars: {
        controls: 0,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          resolve({ goNext, goPrev, jumpToIndex, togglePlayPause, pause, retry });
        },
        onStateChange: handleStateChange,
        onError: handleError,
      },
    });
  }));
}

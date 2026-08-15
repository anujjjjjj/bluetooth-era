import { PLAYLIST } from './playlist.js';

function formatTime(seconds) {
  const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function createClock(el) {
  function render() {
    el.textContent = new Date()
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      .toLowerCase();
  }
  render();
  setInterval(render, 30000);
}

// Purely decorative — a "devices paired" figure in keeping with the Bluetooth
// pairing fiction (§15.2's device list, §15.7's rejected live-presence idea).
// Not a real count of anything: it's a local, per-visit random walk, floored at
// 30 so it never reads as empty. Never claims to be live viewer analytics.
function createDeviceCounter(el) {
  let count = 30 + Math.floor(Math.random() * 9);
  el.textContent = String(count);
  setInterval(() => {
    count += Math.floor(Math.random() * 5) - 2;
    if (count < 30) count = 30;
    el.textContent = String(count);
  }, 25000 + Math.random() * 15000);
}

// Mounts the DOM (including the #yt element createPlayer() needs to exist
// before it can attach the IFrame player) and wires display updates from the
// bus. Control clicks are wired separately via bindPlayer() once createPlayer()
// has resolved, avoiding a chicken-and-egg dependency between the two.
export function createPlayerUi(bus, root) {
  const first = PLAYLIST[0];
  root.innerHTML = `
    <div class="clock"></div>

    <div class="devices-badge">
      <span class="devices-badge__dot" aria-hidden="true"></span>
      <span class="devices-badge__count">30</span> devices paired
    </div>

    <a class="yt-music-link" href="https://music.youtube.com/playlist?list=PLNQk18YUccs2R8_aqb6EgEDA5e-uACqWm" target="_blank" rel="noopener noreferrer">
      YT Music &#8599;
    </a>

    <div class="yt-clip"><div id="yt"></div></div>

    <div class="player-bar">
      <img class="player-bar__art" src="https://img.youtube.com/vi/${first.id}/mqdefault.jpg" alt="" />
      <div class="player-bar__info">
        <div class="player-bar__title">${first.title}</div>
        <div class="player-bar__artist">${first.artist}</div>
        <div class="player-bar__progress"><div class="player-bar__progress-fill"></div></div>
        <div class="player-bar__time">0:00 / 0:00</div>
      </div>
      <div class="player-bar__controls">
        <button type="button" class="player-bar__btn" data-action="prev" aria-label="Previous track">&#9198;</button>
        <button type="button" class="player-bar__btn player-bar__btn--main" data-action="playpause" aria-label="Play or pause">&#9654;</button>
        <button type="button" class="player-bar__btn" data-action="next" aria-label="Next track">&#9197;</button>
      </div>
      <div class="player-bar__status" hidden></div>
    </div>
  `;

  const els = {
    art: root.querySelector('.player-bar__art'),
    title: root.querySelector('.player-bar__title'),
    artist: root.querySelector('.player-bar__artist'),
    time: root.querySelector('.player-bar__time'),
    progress: root.querySelector('.player-bar__progress'),
    fill: root.querySelector('.player-bar__progress-fill'),
    playBtn: root.querySelector('[data-action="playpause"]'),
    status: root.querySelector('.player-bar__status'),
  };

  createDeviceCounter(root.querySelector('.devices-badge__count'));
  createClock(root.querySelector('.clock'));

  bus.addEventListener('track:change', (e) => {
    const { videoId, title, artist } = e.detail;
    els.title.textContent = title;
    els.artist.textContent = artist;
    els.art.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    els.art.alt = `${title} cover art`;
    els.fill.style.width = '0%';
    els.status.hidden = true;
  });

  bus.addEventListener('player:tick', (e) => {
    const { currentTime, duration } = e.detail;
    els.time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    els.fill.style.width = `${pct}%`;
  });

  bus.addEventListener('player:playing', () => {
    els.playBtn.innerHTML = '&#10074;&#10074;';
    els.playBtn.setAttribute('aria-label', 'Pause');
  });

  bus.addEventListener('player:paused', () => {
    els.playBtn.innerHTML = '&#9654;';
    els.playBtn.setAttribute('aria-label', 'Play');
  });

  bus.addEventListener('player:blocked', () => {
    els.status.hidden = false;
    els.status.textContent = 'No files received';
  });

  bus.addEventListener('player:retry', () => {
    els.status.hidden = true;
  });

  function bindPlayer(player) {
    root.querySelector('.player-bar__controls').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'prev') player.goPrev();
      else if (action === 'next') player.goNext();
      else if (action === 'playpause') player.togglePlayPause();
    });
    els.status.addEventListener('click', () => player.retry());

    // Click-to-seek and drag-to-scrub on the progress bar. Pointer Events
    // cover mouse and touch uniformly. Fill updates immediately on drag
    // rather than waiting for the next player:tick poll (up to 250ms away),
    // which would otherwise feel laggy while scrubbing.
    let dragging = false;
    function seekFromEvent(e) {
      const rect = els.progress.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      els.fill.style.width = `${Math.max(0, Math.min(100, fraction * 100))}%`;
      player.seekToFraction(fraction);
    }
    els.progress.addEventListener('pointerdown', (e) => {
      dragging = true;
      els.progress.setPointerCapture(e.pointerId);
      seekFromEvent(e);
    });
    els.progress.addEventListener('pointermove', (e) => {
      if (dragging) seekFromEvent(e);
    });
    els.progress.addEventListener('pointerup', () => {
      dragging = false;
    });
    els.progress.addEventListener('pointercancel', () => {
      dragging = false;
    });
  }

  return { bindPlayer };
}

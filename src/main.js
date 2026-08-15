import { createPlayer } from './player.js';
import { createPlayerUi } from './player-ui.js';
import { createRingtoneButton } from './ringtone.js';

const bus = new EventTarget();

bus.addEventListener('player:error', (e) => {
  console.warn('[main] player:error', e.detail);
});
bus.addEventListener('player:blocked', () => {
  console.error('[main] player:blocked — showing retry state');
});
bus.addEventListener('player:fatal', (e) => {
  console.error('[main] player:fatal', e.detail);
});

const ui = createPlayerUi(bus, document.getElementById('player-root'));
createRingtoneButton(document.getElementById('ringtone-root'));

createPlayer(bus).then((player) => {
  ui.bindPlayer(player);
});

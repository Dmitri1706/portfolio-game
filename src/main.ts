import Phaser from 'phaser';
import './style.css';
import { BG_COLOR, GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: BG_COLOR,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, LobbyScene],
});

/**
 * Масштаб «по размеру окна». Если целое увеличение заполняет экран почти полностью (≥ 85%),
 * берём его — пиксели получаются идеально ровными. Иначе — дробный масштаб, чтобы не было больших рамок.
 */
function fitToWindow(): void {
  const z = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  const zi = Math.floor(z);
  const zoom = zi >= 1 && zi / z >= 0.85 ? zi : z;
  game.scale.setZoom(zoom);
}

window.addEventListener('resize', fitToWindow);
window.addEventListener('orientationchange', () => setTimeout(fitToWindow, 200));
game.events.once(Phaser.Core.Events.READY, fitToWindow);

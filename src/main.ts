import Phaser from 'phaser';
import './style.css';
import './ui/fonts.css';
import './ui/ui.css';
import { BG_COLOR, GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { VhodScene } from './scenes/VhodScene';
import { SportScene } from './scenes/SportScene';

/** Ждём пиксельные шрифты: Phaser рисует надписи на canvas и должен получить уже загруженный шрифт. */
async function loadFonts(): Promise<void> {
  const sample = 'АаЯя Aa 0…';
  const fonts = ['8px Tiny5', '8px "Press Start 2P"', '16px "PT Sans"'];
  const timeout = new Promise((r) => setTimeout(r, 3000));
  try {
    await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f, sample))), timeout]);
  } catch {
    // без шрифта игра всё равно запустится — с запасным шрифтом
  }
}

function startGame(): Phaser.Game {
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
    scene: [BootScene, LobbyScene, VhodScene, SportScene],
  });

  /**
   * Масштаб «по размеру окна». Если целое увеличение заполняет экран почти полностью (≥ 85%),
   * берём его — пиксели получаются идеально ровными. Иначе — дробный масштаб, чтобы не было больших рамок.
   */
  const fitToWindow = () => {
    const z = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
    const zi = Math.floor(z);
    game.scale.setZoom(zi >= 1 && zi / z >= 0.85 ? zi : z);
  };
  window.addEventListener('resize', fitToWindow);
  window.addEventListener('orientationchange', () => setTimeout(fitToWindow, 200));
  game.events.once(Phaser.Core.Events.READY, fitToWindow);
  // Только в режиме разработки: доступ к игре из консоли браузера для проверок
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
  return game;
}

loadFonts().then(startGame);

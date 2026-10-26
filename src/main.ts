import Phaser from 'phaser';
import './style.css';
import './ui/fonts.css';
import './ui/ui.css';
import './ui/case.css';
import './ui/dialog.css';
import { BG_COLOR, GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { VhodScene } from './scenes/VhodScene';
import { SportScene } from './scenes/SportScene';

/** Ширина видимой области в игровых пикселях при вертикальном телефоне */
const PORTRAIT_W = 300;

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
   * Масштаб «по размеру окна». Игровое поле занимает весь экран.
   * Горизонтально: всегда видно минимум 480×270 игровых пикселей — комната целиком.
   * Вертикально (телефон): по ширине 300 игровых пикселей, крупнее; камера следует за персонажем.
   * Если целое увеличение почти не меняет размер (≥ 85%), берём его — пиксели идеально ровные.
   */
  const fitToWindow = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const z = h > w ? w / PORTRAIT_W : Math.min(w / GAME_W, h / GAME_H);
    const zi = Math.floor(z);
    const zoom = zi >= 1 && zi / z >= 0.85 ? zi : z;
    game.scale.resize(Math.ceil(w / zoom), Math.ceil(h / zoom));
    game.scale.setZoom(zoom);
  };
  window.addEventListener('resize', fitToWindow);
  window.addEventListener('orientationchange', () => setTimeout(fitToWindow, 200));
  game.events.once(Phaser.Core.Events.READY, fitToWindow);
  // Только в режиме разработки: доступ к игре из консоли браузера для проверок
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
  return game;
}

loadFonts().then(startGame);

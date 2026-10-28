import Phaser from 'phaser';
import './style.css';
import './ui/fonts.css';
import './ui/ui.css';
import './ui/case.css';
import './ui/dialog.css';
import './ui/theme.css';
import { BG_COLOR, GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { VhodScene } from './scenes/VhodScene';
import { SportScene } from './scenes/SportScene';

/** Не больше стольких пикселей на холсте (быстродействие на слабых телефонах) */
const MAX_PIXELS = 2560 * 1440;

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
    // Графика из Blender: сглаживание включено, пиксельный режим выключен
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 2 },
    scene: [BootScene, LobbyScene, VhodScene, SportScene],
  });

  /**
   * Холст — на весь экран и в «настоящих» пикселях устройства (с учётом плотности экрана),
   * поэтому на телефонах картинка чёткая. Сколько комнаты видно — решает камера сцены (см. RoomScene).
   */
  const fitToWindow = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (w * h));
    game.scale.resize(Math.round(w * dpr), Math.round(h * dpr));
    game.scale.setZoom(1 / dpr);
  };
  window.addEventListener('resize', fitToWindow);
  window.addEventListener('orientationchange', () => setTimeout(fitToWindow, 200));
  game.events.once(Phaser.Core.Events.READY, fitToWindow);
  // Только в режиме разработки: доступ к игре из консоли браузера для проверок
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
  return game;
}

loadFonts().then(startGame);

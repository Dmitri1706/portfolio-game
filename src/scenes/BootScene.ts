import Phaser from 'phaser';
import { createAnims, loadSprites } from '../assets/manifest';
import LOBBY_LAYOUT from '../assets/rooms/lobby.layout.json';
import VHOD_LAYOUT from '../assets/rooms/vhod.layout.json';
import SPORT_LAYOUT from '../assets/rooms/sport.layout.json';
import { loadDiorama, type Layout } from '../world/diorama';
import { createCharacterAnims, loadCharacters } from '../world/characters';
import { finishLoading, setLoadProgress } from '../ui/loader';
import { createHud } from '../ui/hud';
import { orientationHint } from '../ui/orientation';
import type { RoomData } from './RoomScene';

/** Загрузка ресурсов игры; прогресс показывается на экране «Считаю конверсию вашего визита… N%». */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => setLoadProgress(v));
    loadSprites(this.load);
    // персонажи из Blender: по листу на каждую анимацию (строки — направления, столбцы — кадры)
    loadCharacters(this.load);
    loadDiorama(this.load, LOBBY_LAYOUT as Layout);
    loadDiorama(this.load, VHOD_LAYOUT as Layout);
    loadDiorama(this.load, SPORT_LAYOUT as Layout);
  }

  async create(): Promise<void> {
    createAnims(this.anims);
    createCharacterAnims(this.anims);
    this.makeFxTextures();
    await finishLoading();
    createHud();
    orientationHint();
    this.scene.start('Lobby', { intro: true } satisfies RoomData);
  }

  /** Простые текстуры эффектов: тень, маркер, искорка, облачко пыли (рисуются кодом, без картинок). */
  private makeFxTextures(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x0c0810, 0.45).fillEllipse(40, 14, 72, 24);
    g.generateTexture('shadow3d', 80, 28);
    g.clear();
    g.lineStyle(4, 0xffc94a, 1).strokeEllipse(40, 20, 72, 34);
    g.lineStyle(2, 0xfff1c4, 0.9).strokeEllipse(40, 20, 52, 24);
    g.generateTexture('marker3d', 80, 40);
    g.clear();
    g.fillStyle(0xfff4c8, 1);
    g.fillTriangle(12, 0, 15, 12, 9, 12).fillTriangle(12, 24, 15, 12, 9, 12);
    g.fillTriangle(0, 12, 12, 9, 12, 15).fillTriangle(24, 12, 12, 9, 12, 15);
    g.fillStyle(0xffffff, 1).fillCircle(12, 12, 3);
    g.generateTexture('sparkle3d', 24, 24);
    g.clear();
    g.fillStyle(0xd9cbb8, 0.85).fillCircle(16, 16, 15);
    g.fillStyle(0xf2e8da, 0.9).fillCircle(13, 12, 9);
    g.generateTexture('puff', 32, 32);
    g.clear();
    // искра сварки: яркая точка с ореолом
    g.fillStyle(0xff9a2e, 0.35).fillCircle(6, 6, 6);
    g.fillStyle(0xffd27a, 0.8).fillCircle(6, 6, 3.2);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 1.6);
    g.generateTexture('spark', 12, 12);
    g.clear();
    // вспышка сварки
    g.fillStyle(0x9fe8ff, 0.25).fillCircle(20, 20, 20);
    g.fillStyle(0xd8f6ff, 0.6).fillCircle(20, 20, 10);
    g.fillStyle(0xffffff, 1).fillCircle(20, 20, 4);
    g.generateTexture('weld_flash', 40, 40);
    g.clear();
    // значки над покупателем: «!» (ждёт продавца) и «…» (продажа закрыта)
    for (const [key, dots] of [['talk_alert', false], ['talk_dots', true]] as const) {
      g.clear();
      g.fillStyle(0x231d33, 1).fillRoundedRect(0, 0, 40, 34, 9).fillTriangle(14, 32, 26, 32, 20, 42);
      g.fillStyle(0xffc94a, 1).fillRoundedRect(3, 3, 34, 28, 7).fillTriangle(16, 30, 24, 30, 20, 37);
      g.fillStyle(0x231d33, 1);
      if (dots) [11, 20, 29].forEach((x) => g.fillCircle(x, 17, 3));
      else g.fillRoundedRect(17, 7, 6, 14, 2).fillCircle(20, 26, 3);
      g.generateTexture(key, 40, 44);
    }
    g.clear();
    // стрелка над нужной полкой
    g.fillStyle(0x231d33, 1).fillRect(10, 0, 16, 18).fillTriangle(0, 16, 36, 16, 18, 36);
    g.fillStyle(0xffc94a, 1).fillRect(13, 3, 10, 15).fillTriangle(6, 19, 30, 19, 18, 31);
    g.generateTexture('arrow3d', 36, 38);
    g.destroy();
  }
}

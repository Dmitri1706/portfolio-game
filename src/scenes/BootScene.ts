import Phaser from 'phaser';
import { createAnims, loadSprites } from '../assets/manifest';
import { finishLoading, setLoadProgress } from '../ui/loader';
import { createHud } from '../ui/hud';
import type { RoomData } from './RoomScene';

/** Загрузка ресурсов игры; прогресс показывается на экране «Считаю конверсию вашего визита… N%». */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => setLoadProgress(v));
    loadSprites(this.load);
  }

  async create(): Promise<void> {
    createAnims(this.anims);
    await finishLoading();
    createHud();
    this.scene.start('Lobby', { intro: true } satisfies RoomData);
  }
}

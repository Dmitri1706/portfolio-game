import Phaser from 'phaser';
import { createAnims, loadSprites } from '../assets/manifest';

/** Загрузка ресурсов. На Этапе 2 здесь появится экран «Считаю конверсию вашего визита… N%». */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    loadSprites(this.load);
  }

  create(): void {
    createAnims(this.anims);
    this.scene.start('Lobby');
  }
}

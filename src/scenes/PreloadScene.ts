import Phaser from 'phaser';
import { SCREEN } from '../config/GameConfig';

const GAME_ASSETS = {
  hero_kaito: 'assets/sprites/heroes/kaito.png',
  hero_ren: 'assets/sprites/heroes/ren.png',
  enemy_scout: 'assets/sprites/enemies/shadow_scout.png',
  enemy_brute: 'assets/sprites/enemies/shadow_brute.png',
  enemy_boss: 'assets/sprites/enemies/kage_lord.png',
} as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.createLoadingBar();
    Object.entries(GAME_ASSETS).forEach(([key, path]) => this.load.image(key, path));
  }

  create(): void {
    Object.keys(GAME_ASSETS).forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
    this.scene.start('CharacterSelectScene');
  }

  private createLoadingBar(): void {
    const { WIDTH, HEIGHT } = SCREEN;
    const barWidth = 420;
    const barHeight = 18;
    const x = WIDTH / 2 - barWidth / 2;
    const y = HEIGHT / 2;
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 520, 180, 0x10172b, 0.95)
      .setStrokeStyle(2, 0x49d5ff, 0.45);
    const title = this.add.text(WIDTH / 2, y - 56, 'SHADOW CHRONICLES', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '24px', color: '#eaf8ff',
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, y - 26, 'กำลังเตรียมสนามรบ...', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#8ea6c9',
    }).setOrigin(0.5);
    const barBg = this.add.rectangle(WIDTH / 2, y + 18, barWidth + 8, barHeight + 8, 0x07101f)
      .setStrokeStyle(1, 0x355070);
    const bar = this.add.rectangle(x, y + 18, 2, barHeight, 0x42d9ff).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => bar.width = Math.max(2, barWidth * value));
    this.load.on('complete', () => [panel, title, subtitle, barBg, bar].forEach((item) => item.destroy()));
  }
}

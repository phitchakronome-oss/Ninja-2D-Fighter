import Phaser from 'phaser';
import { SCREEN } from '../config/GameConfig';
import { AnimationController } from '../systems/AnimationController';

const GAME_ASSETS = {
  hero_kaito: 'assets/sprites/heroes/kaito.png',
  hero_ren: 'assets/sprites/heroes/ren.png',
  enemy_scout: 'assets/sprites/enemies/shadow_scout.png',
  enemy_brute: 'assets/sprites/enemies/shadow_brute.png',
  enemy_boss: 'assets/sprites/enemies/kage_lord.png',
  stage_moon_valley: 'assets/backgrounds/moonlit_valley.jpg',
} as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.createLoadingBar();
    Object.entries(GAME_ASSETS).forEach(([key, path]) => this.load.image(key, path));
    this.load.spritesheet('char_kaito_sheet', 'assets/sprites/animations/naruto/base/naruto_combat_sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('char_kaito_spirit_sheet', 'assets/sprites/animations/naruto/form2/kaito_spirit_combat_sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('vfx_wind_orb_sheet', 'assets/effects/naruto/wind_orb_sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
  }

  create(): void {
    Object.keys(GAME_ASSETS).forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
    this.textures.get('char_kaito_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('char_kaito_spirit_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('vfx_wind_orb_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    AnimationController.registerAllFromData(this);
    if (!this.anims.exists('kaito_spirit_run')) {
      this.anims.create({
        key: 'kaito_spirit_run',
        frames: this.anims.generateFrameNumbers('char_kaito_spirit_sheet', { start: 0, end: 11 }),
        frameRate: 16,
        repeat: -1,
      });
      this.anims.create({
        key: 'kaito_spirit_attack1',
        frames: this.anims.generateFrameNumbers('char_kaito_spirit_sheet', { start: 12, end: 19 }),
        frameRate: 24,
        repeat: 0,
      });
    }
    if (!this.anims.exists('wind_orb_spin')) {
      this.anims.create({
        key: 'wind_orb_spin',
        frames: this.anims.generateFrameNumbers('vfx_wind_orb_sheet', { start: 0, end: 14 }),
        frameRate: 32,
        repeat: -1,
      });
      this.anims.create({
        key: 'wind_orb_impact',
        frames: this.anims.generateFrameNumbers('vfx_wind_orb_sheet', { start: 15, end: 20 }),
        frameRate: 28,
        repeat: 0,
      });
    }
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

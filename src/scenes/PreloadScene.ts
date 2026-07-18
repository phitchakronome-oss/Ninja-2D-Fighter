import Phaser from 'phaser';
import { SCREEN } from '../config/GameConfig';
import { AnimationController } from '../systems/AnimationController';

const GAME_ASSETS = {
  hero_kaito: 'assets/sprites/heroes/kaito.png',
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
    this.load.spritesheet('char_kaito_kick_sheet', 'assets/sprites/animations/naruto/base/kaito_kick_sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('vfx_wind_orb_sheet', 'assets/effects/naruto/wind_orb_sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('enemy_scout_sheet', 'assets/sprites/animations/enemies/scout_combat_sheet.png', {
      frameWidth: 256, frameHeight: 256,
    });
    this.load.spritesheet('enemy_brute_sheet', 'assets/sprites/animations/enemies/brute_combat_sheet.png', {
      frameWidth: 256, frameHeight: 256,
    });
  }

  create(): void {
    Object.keys(GAME_ASSETS).forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
    this.textures.get('char_kaito_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('char_kaito_spirit_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('char_kaito_kick_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('vfx_wind_orb_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('enemy_scout_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('enemy_brute_sheet').setFilter(Phaser.Textures.FilterMode.LINEAR);
    AnimationController.registerAllFromData(this);
    if (!this.anims.exists('kaito_attack2')) {
      this.anims.create({
        key: 'kaito_attack2',
        frames: this.anims.generateFrameNumbers('char_kaito_kick_sheet', { start: 0, end: 7 }),
        frameRate: 24,
        repeat: 0,
      });
    }
    if (!this.anims.exists('kaito_spirit_run')) {
      const clips = {
        idle: [19, 19, 1, -1], run: [0, 11, 20, -1], jump: [3, 3, 1, 0],
        fall: [11, 11, 1, 0], dash: [0, 7, 36, 0], charge: [19, 19, 1, -1], skill: [12, 19, 24, 0], attack1: [12, 19, 24, 0],
        attack2: [12, 19, 27, 0], attack3: [12, 19, 21, 0], hurt: [18, 18, 1, 0], dead: [19, 19, 1, 0],
      } as const;
      Object.entries(clips).forEach(([state, [start, end, frameRate, repeat]]) => {
        this.anims.create({
          key: `kaito_spirit_${state}`,
          frames: this.anims.generateFrameNumbers('char_kaito_spirit_sheet', { start, end }),
          frameRate,
          repeat,
        });
      });
    }
    this.createEnemyAnimations();
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
    this.scene.start('MainMenuScene');
  }

  private createEnemyAnimations(): void {
    const clips = [
      ['scout', 'idle', 0, 0, 1, -1], ['scout', 'run', 0, 3, 14, -1], ['scout', 'attack', 4, 7, 18, 0],
      ['brute', 'idle', 0, 0, 1, -1], ['brute', 'run', 0, 3, 9, -1], ['brute', 'attack', 4, 7, 12, 0],
    ] as const;
    clips.forEach(([kind, state, start, end, frameRate, repeat]) => {
      const key = `enemy_${kind}_${state}`;
      if (!this.anims.exists(key)) this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(`enemy_${kind}_sheet`, { start, end }),
        frameRate,
        repeat,
      });
    });
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

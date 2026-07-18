import Phaser from 'phaser';
import { DEFAULT_GAME_SETTINGS, SCREEN, type GameSettings } from '../config/GameConfig';

type CheatKey = 'infiniteChakra' | 'invincible' | 'zeroCooldown';

export class MainMenuScene extends Phaser.Scene {
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private modeText!: Phaser.GameObjects.Text;
  private modeButton!: Phaser.GameObjects.Rectangle;
  private toggleViews = new Map<CheatKey, { box: Phaser.GameObjects.Rectangle; mark: Phaser.GameObjects.Text }>();

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.add.image(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 'stage_moon_valley')
      .setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT);
    this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, SCREEN.WIDTH, SCREEN.HEIGHT, 0x020711, 0.58);

    this.add.text(SCREEN.WIDTH / 2, 88, 'SHADOW CHRONICLES', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '48px', color: '#f2fbff',
      stroke: '#07101f', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(SCREEN.WIDTH / 2, 143, 'ฝ่ากองทัพเงา • ปลดปล่อยพลัง Spirit Mode', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#9debf0',
    }).setOrigin(0.5);

    const panel = this.add.rectangle(SCREEN.WIDTH / 2, 390, 590, 400, 0x071426, 0.94)
      .setStrokeStyle(2, 0x59e2dd, 0.75);
    this.add.text(420, 224, 'GAME MODE', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: '#eaf8ff',
    });

    this.modeButton = this.add.rectangle(SCREEN.WIDTH / 2, 278, 430, 58, 0x10233d, 1)
      .setStrokeStyle(2, 0x64e6db, 0.85)
      .setInteractive({ useHandCursor: true });
    this.modeText = this.add.text(SCREEN.WIDTH / 2, 278, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    this.modeButton.on('pointerdown', () => this.setCheatMode(!this.settings.cheatMode));

    this.add.text(420, 328, 'CHEAT OPTIONS', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#9eb6d7',
    });
    this.createToggle('infiniteChakra', 375, 'จักระไม่จำกัด', 'ใช้สกิลได้โดยจักระไม่ลด');
    this.createToggle('invincible', 430, 'เลือดไม่จำกัด', 'ไม่ได้รับความเสียหายจากศัตรู');
    this.createToggle('zeroCooldown', 485, 'คูลดาวน์ 0', 'ใช้ทุกสกิลซ้ำได้ทันที');

    const start = this.add.rectangle(SCREEN.WIDTH / 2, 575, 330, 66, 0x22b8aa, 0.96)
      .setStrokeStyle(3, 0xbffff8, 0.95)
      .setInteractive({ useHandCursor: true });
    const startText = this.add.text(SCREEN.WIDTH / 2, 575, 'เริ่มเกม', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '25px', color: '#04131a',
    }).setOrigin(0.5);
    start.on('pointerover', () => start.setFillStyle(0x65e6d8));
    start.on('pointerout', () => start.setFillStyle(0x22b8aa));
    start.on('pointerdown', () => this.startGame());
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    void panel;
    void startText;
    this.refresh();
  }

  private createToggle(key: CheatKey, y: number, label: string, description: string): void {
    const row = this.add.rectangle(SCREEN.WIDTH / 2, y, 430, 46, 0x0b1c33, 0.96)
      .setInteractive({ useHandCursor: true });
    const box = this.add.rectangle(452, y, 26, 26, 0x07101f).setStrokeStyle(2, 0x46658d);
    const mark = this.add.text(452, y - 1, '✓', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '19px', color: '#07101f',
    }).setOrigin(0.5).setVisible(false);
    this.add.text(480, y - 14, label, { fontFamily: 'sans-serif', fontSize: '15px', color: '#eaf8ff' });
    this.add.text(480, y + 6, description, { fontFamily: 'sans-serif', fontSize: '11px', color: '#8298b8' });
    row.on('pointerdown', () => {
      if (!this.settings.cheatMode) this.setCheatMode(true);
      this.settings[key] = !this.settings[key];
      this.refresh();
    });
    this.toggleViews.set(key, { box, mark });
  }

  private setCheatMode(enabled: boolean): void {
    this.settings.cheatMode = enabled;
    if (!enabled) {
      this.settings.infiniteChakra = false;
      this.settings.invincible = false;
      this.settings.zeroCooldown = false;
    }
    this.refresh();
  }

  private refresh(): void {
    this.modeText.setText(this.settings.cheatMode ? 'สูตรโกง / ทดสอบ' : 'เล่นแบบธรรมดา');
    this.modeText.setColor(this.settings.cheatMode ? '#ffd166' : '#8ff8ed');
    this.modeButton.setStrokeStyle(2, this.settings.cheatMode ? 0xffd166 : 0x64e6db, 0.9);
    this.toggleViews.forEach((view, key) => {
      const enabled = this.settings[key];
      view.box.setFillStyle(enabled ? 0x64e6db : 0x07101f).setStrokeStyle(2, enabled ? 0xbffff8 : 0x46658d);
      view.mark.setVisible(enabled);
    });
  }

  private startGame(): void {
    this.registry.set('selectedCharacterId', 'kaito');
    this.registry.set('gameSettings', { ...this.settings });
    this.scene.start('StageScene');
  }
}

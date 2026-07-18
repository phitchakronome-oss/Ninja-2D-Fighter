import Phaser from 'phaser';
import { DEBUG, SCREEN } from '../config/GameConfig';
import type { SkillSlot } from '../core/types';
import type { Character } from '../entities/characters/Character';
import type { StageScene } from './StageScene';

export class UIScene extends Phaser.Scene {
  private stage!: StageScene;
  private player!: Character;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private chakraBar!: Phaser.GameObjects.Rectangle;
  private expBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private chakraText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private nextFpsRefresh = 0;
  private endPanel?: Phaser.GameObjects.Container;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseButtonText!: Phaser.GameObjects.Text;
  private skills = new Map<SkillSlot, { box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; key: string }>();

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.stage = this.scene.get('StageScene') as StageScene;
    this.player = this.stage.getPlayer();
    this.createHud();
  }

  update(): void {
    if (!this.player || !this.stage) return;
    this.updateBars();
    this.updateSkills();
    const status = this.stage.getStatus();
    this.pauseOverlay.setVisible(status.paused);
    this.pauseButtonText.setText(status.paused ? '▶ เล่นต่อ' : 'Ⅱ หยุด');
    this.objectiveText.setText(status.boss && !status.boss.isDead() ? 'เป้าหมาย: โค่น KAGE LORD' : `เป้าหมาย: เคลียร์เงาศัตรู  |  เหลือ ${status.remaining}`);
    const message = status.message;
    if (message && this.time.now - message.at < 2200) {
      this.messageText.setText(message.message).setColor(message.color).setAlpha(Math.min(1, (2200 - (this.time.now - message.at)) / 400));
    } else this.messageText.setAlpha(0);

    const endState = this.registry.get('endState') as { victory: boolean; at: number } | undefined;
    if (endState && !this.endPanel) this.showEndPanel(endState.victory);

    if (this.fpsText && this.time.now >= this.nextFpsRefresh) {
      const fps = Math.round(this.game.loop.actualFps);
      this.fpsText.setText(`${fps} FPS`).setColor(fps >= 55 ? '#64e6db' : fps >= 40 ? '#ffd166' : '#ff6688');
      this.nextFpsRefresh = this.time.now + 500;
    }
  }

  private createHud(): void {
    const panel = this.add.rectangle(18, 16, 420, 112, 0x07101f, 0.9).setOrigin(0).setStrokeStyle(2, 0x2d456f, 0.9);
    this.add.text(38, 28, 'SHADOW CHRONICLES', { fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: '#eaf8ff' });
    this.levelText = this.add.text(340, 29, 'LV 1', { fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#ffd166' });
    this.add.text(38, 54, 'HP', { fontFamily: 'monospace', fontSize: '12px', color: '#ff9fba' });
    this.add.text(38, 76, 'CHAKRA', { fontFamily: 'monospace', fontSize: '12px', color: '#64e6db' });
    this.add.text(38, 98, 'EXP', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd166' });
    this.createBar(94, 61, 270, 12, 0xff6688, (bar) => this.hpBar = bar);
    this.createBar(94, 83, 270, 10, 0x64e6db, (bar) => this.chakraBar = bar);
    this.createBar(94, 103, 270, 6, 0xffd166, (bar) => this.expBar = bar);
    this.hpText = this.add.text(374, 53, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffdce5' });
    this.chakraText = this.add.text(374, 75, '', { fontFamily: 'monospace', fontSize: '11px', color: '#c8fffa' });

    this.objectiveText = this.add.text(SCREEN.WIDTH / 2, 22, '', { fontFamily: 'monospace', fontSize: '14px', color: '#d8e7ff', backgroundColor: '#07101fbb', padding: { left: 14, right: 14, top: 7, bottom: 7 } }).setOrigin(0.5, 0);
    if (DEBUG.SHOW_FPS) {
      this.fpsText = this.add.text(SCREEN.WIDTH - 126, 18, '-- FPS', { fontFamily: 'monospace', fontSize: '12px', color: '#64e6db', backgroundColor: '#07101fbb', padding: { left: 7, right: 7, top: 5, bottom: 5 } }).setOrigin(1, 0);
    }
    this.messageText = this.add.text(SCREEN.WIDTH / 2, 138, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '24px', stroke: '#07101f', strokeThickness: 6 }).setOrigin(0.5).setDepth(20);

    const activeCheats = [
      this.player.isInvincible() ? 'HP∞' : '',
      this.player.hasInfiniteChakra() ? 'CHAKRA∞' : '',
      this.player.hasZeroCooldown() ? 'CD0' : '',
    ].filter(Boolean);
    if (activeCheats.length > 0) {
      this.add.text(438, 106, `CHEAT  ${activeCheats.join('  ')}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffd166',
        backgroundColor: '#07101fdd', padding: { left: 7, right: 7, top: 4, bottom: 4 },
      }).setOrigin(0, 1);
    }

    const pauseButton = this.add.rectangle(SCREEN.WIDTH - 64, 29, 104, 34, 0x111c35, 0.96)
      .setStrokeStyle(2, 0x64e6db, 0.72).setInteractive({ useHandCursor: true }).setDepth(102);
    this.pauseButtonText = this.add.text(pauseButton.x, pauseButton.y, 'Ⅱ หยุด', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '13px', color: '#eaf8ff',
    }).setOrigin(0.5).setDepth(103);
    pauseButton.on('pointerover', () => pauseButton.setFillStyle(0x1b3153));
    pauseButton.on('pointerout', () => pauseButton.setFillStyle(0x111c35));
    pauseButton.on('pointerdown', () => this.stage.togglePause());

    const hint = this.add.text(18, SCREEN.HEIGHT - 31, 'A/D เดิน • W กระโดด • J โจมตี • C ชาร์จจักระ • U/I/O สกิล • K อัลติ • L ร่าง 2 • P/ESC หยุด', { fontFamily: 'monospace', fontSize: '12px', color: '#93a4c4', backgroundColor: '#07101fcc', padding: { left: 8, right: 8, top: 6, bottom: 6 } });
    hint.setScrollFactor(0);

    const skillData: { slot: SkillSlot; key: string; color: number }[] = [
      { slot: 'skill1', key: 'U', color: 0x64e6db },
      { slot: 'skill2', key: 'I', color: 0x8b5cf6 },
      { slot: 'skill3', key: 'O', color: 0xf59e0b },
      { slot: 'ultimate', key: 'K', color: 0xffffff },
      { slot: 'transform', key: 'L', color: 0xffd166 },
    ];
    skillData.forEach((item, index) => {
      const x = SCREEN.WIDTH - 52 - index * 62;
      const box = this.add.rectangle(x, SCREEN.HEIGHT - 70, 50, 42, 0x111c35, 0.95).setStrokeStyle(2, item.color, 0.7);
      const label = this.add.text(x, SCREEN.HEIGHT - 70, item.key, { fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
      this.skills.set(item.slot, { box, label, key: item.key });
    });
    this.createPauseOverlay();
    void panel;
  }

  private createPauseOverlay(): void {
    const veil = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, SCREEN.WIDTH, SCREEN.HEIGHT, 0x02050d, 0.72)
      .setInteractive();
    const panel = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 470, 280, 0x0b1730, 0.98)
      .setStrokeStyle(3, 0x64e6db, 0.9);
    const title = this.add.text(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2 - 78, 'หยุดชั่วคราว', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: '#eaf8ff',
    }).setOrigin(0.5);
    const hint = this.add.text(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2 - 25, 'กด P / ESC หรือเลือกคำสั่งด้านล่าง', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9fb8dc',
    }).setOrigin(0.5);
    const [resume, resumeText] = this.createUiButton(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2 + 35, 210, '▶ เล่นต่อ', 0x183b50, () => this.stage.togglePause());
    const [menu, menuText] = this.createUiButton(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2 + 92, 210, 'กลับหน้าแรก', 0x18233a, () => this.stage.returnToMenu());
    this.pauseOverlay = this.add.container(0, 0, [veil, panel, title, hint, resume, resumeText, menu, menuText]).setDepth(100).setVisible(false);
  }

  private createBar(x: number, y: number, width: number, height: number, color: number, assign: (bar: Phaser.GameObjects.Rectangle) => void): void {
    this.add.rectangle(x, y, width, height, 0x182541).setOrigin(0, 0.5).setStrokeStyle(1, 0x38517a);
    const bar = this.add.rectangle(x + 2, y, width - 4, Math.max(3, height - 4), color).setOrigin(0, 0.5);
    assign(bar);
  }

  private updateBars(): void {
    this.hpBar.width = 266 * Math.max(0, this.player.hp / this.player.maxHp);
    this.chakraBar.width = 266 * Math.max(0, this.player.chakra / this.player.maxChakra);
    this.expBar.width = 266 * Math.max(0, this.player.exp / this.player.getExpToNextLevel());
    this.hpText.setText(this.player.isInvincible() ? '∞  TEST' : `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`);
    this.chakraBar.setFillStyle(this.player.isChargingChakra() ? 0xc8fffa : 0x64e6db);
    this.chakraText.setText(this.player.hasInfiniteChakra() ? '∞  TEST' : this.player.isChargingChakra() ? `CHG ${Math.floor(this.player.chakra)}` : `${Math.floor(this.player.chakra)} / ${this.player.maxChakra}`);
    this.levelText.setText(`LV ${this.player.level}  •  ${this.player.gold} G`);
  }

  private updateSkills(): void {
    this.skills.forEach((view, slot) => {
      const cooldown = this.player.getCooldown(slot);
      view.label.setText(cooldown > 0 ? `${Math.ceil(cooldown / 1000)}` : slot === 'transform' && this.player.isTransformed ? 'ON' : view.key);
      view.label.setAlpha(cooldown > 0 ? 0.55 : 1);
      view.box.setFillStyle(cooldown > 0 ? 0x080d1b : 0x111c35);
    });
  }

  private showEndPanel(victory: boolean): void {
    const veil = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, SCREEN.WIDTH, SCREEN.HEIGHT, 0x02050d, 0.8).setInteractive();
    const panel = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 560, 320, 0x0b1730, 0.98).setStrokeStyle(3, victory ? 0xffd166 : 0xff6688);
    const title = this.add.text(SCREEN.WIDTH / 2, 265, victory ? 'MISSION COMPLETE' : 'MISSION FAILED', { fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: victory ? '#ffd166' : '#ff8fab' }).setOrigin(0.5);
    const body = this.add.text(SCREEN.WIDTH / 2, 330, victory ? `สนามรบถูกชำระแล้ว\nเลเวล ${this.player.level}  •  ${this.player.kills} KILLS  •  ${this.player.gold} G` : `เงามืดกลืนกินสนามรบ\nกำจัดศัตรูได้ ${this.player.kills} ตัว  •  ${this.player.gold} G`, { fontFamily: 'monospace', fontSize: '16px', color: '#d8e7ff', align: 'center', lineSpacing: 10 }).setOrigin(0.5);
    const [restart, restartText] = this.createUiButton(SCREEN.WIDTH / 2 - 120, 430, 210, 'R  เล่นอีกครั้ง', victory ? 0x55451e : 0x4b2030, () => this.stage.restartBattle());
    const [menu, menuText] = this.createUiButton(SCREEN.WIDTH / 2 + 120, 430, 210, 'M  หน้าแรก', 0x18233a, () => this.stage.returnToMenu());
    this.endPanel = this.add.container(0, 0, [veil, panel, title, body, restart, restartText, menu, menuText]).setDepth(120);
  }

  private createUiButton(x: number, y: number, width: number, label: string, color: number, onClick: () => void): [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text] {
    const button = this.add.rectangle(x, y, width, 44, color, 1)
      .setStrokeStyle(2, 0x64e6db, 0.85)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setAlpha(0.78));
    button.on('pointerout', () => button.setAlpha(1));
    button.on('pointerdown', onClick);
    return [button, text];
  }
}

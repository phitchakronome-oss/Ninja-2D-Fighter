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
      this.fpsText = this.add.text(SCREEN.WIDTH - 18, 18, '-- FPS', { fontFamily: 'monospace', fontSize: '12px', color: '#64e6db', backgroundColor: '#07101fbb', padding: { left: 7, right: 7, top: 5, bottom: 5 } }).setOrigin(1, 0);
    }
    this.messageText = this.add.text(SCREEN.WIDTH / 2, 138, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '24px', stroke: '#07101f', strokeThickness: 6 }).setOrigin(0.5).setDepth(20);

    const hint = this.add.text(18, SCREEN.HEIGHT - 31, 'A/D เดิน • W กระโดด • J โจมตี • U/I/O สกิล • K อัลติ • L โหมดจักระ • R เริ่มใหม่', { fontFamily: 'monospace', fontSize: '12px', color: '#93a4c4', backgroundColor: '#07101fcc', padding: { left: 8, right: 8, top: 6, bottom: 6 } });
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
    void panel;
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
    this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp}`);
    this.chakraText.setText(DEBUG.INFINITE_CHAKRA ? '∞  TEST' : `${Math.floor(this.player.chakra)} / ${this.player.maxChakra}`);
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
    const veil = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, SCREEN.WIDTH, SCREEN.HEIGHT, 0x02050d, 0.78);
    const panel = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 500, 270, 0x0b1730, 0.98).setStrokeStyle(3, victory ? 0xffd166 : 0xff6688);
    const title = this.add.text(SCREEN.WIDTH / 2, 275, victory ? 'MISSION COMPLETE' : 'MISSION FAILED', { fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: victory ? '#ffd166' : '#ff8fab' }).setOrigin(0.5);
    const body = this.add.text(SCREEN.WIDTH / 2, 335, victory ? `สนามรบถูกชำระแล้ว\nเลเวล ${this.player.level}  •  ${this.player.kills} KILLS  •  ${this.player.gold} G` : 'เงามืดกลืนกินสนามรบ\nกด R เพื่อเริ่มการต่อสู้อีกครั้ง', { fontFamily: 'monospace', fontSize: '16px', color: '#d8e7ff', align: 'center', lineSpacing: 10 }).setOrigin(0.5);
    const hint = this.add.text(SCREEN.WIDTH / 2, 435, victory ? 'กด R เพื่อเล่นซ้ำและทำลายสถิติ' : 'R  RESTART', { fontFamily: 'monospace', fontSize: '13px', color: '#93a4c4' }).setOrigin(0.5);
    this.endPanel = this.add.container(0, 0, [veil, panel, title, body, hint]).setDepth(50);
  }
}

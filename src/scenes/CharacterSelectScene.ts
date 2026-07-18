import Phaser from 'phaser';
import { SCREEN } from '../config/GameConfig';
import { CHARACTER_ROSTER } from '../data/characters';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private preview!: Phaser.GameObjects.Sprite;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.createBackdrop();
    this.add.text(SCREEN.WIDTH / 2, 70, 'SHADOW CHRONICLES', { fontFamily: 'Arial Black, sans-serif', fontSize: '42px', color: '#eaf8ff' }).setOrigin(0.5);
    this.add.text(SCREEN.WIDTH / 2, 116, 'เลือกนินจาของคุณ แล้วฝ่าคลื่นเงามืดให้ถึงบอส', { fontFamily: 'sans-serif', fontSize: '16px', color: '#8ea6c9' }).setOrigin(0.5);
    this.preview = this.add.sprite(SCREEN.WIDTH / 2, 300, CHARACTER_ROSTER[0].spriteKey)
      .setDisplaySize(225, 150).setOrigin(0.5, 1);

    CHARACTER_ROSTER.forEach((definition, index) => this.createCard(definition, index));
    this.add.text(SCREEN.WIDTH / 2, 604, 'คลิกการ์ดเพื่อเริ่ม  •  ใช้ ← → และ Enter ได้เช่นกัน', { fontFamily: 'monospace', fontSize: '13px', color: '#93a4c4' }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-LEFT', () => this.selectIndex(this.selectedIndex - 1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.selectIndex(this.selectedIndex + 1));
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.refreshSelection();
  }

  private createCard(definition: typeof CHARACTER_ROSTER[number], index: number): void {
    const x = SCREEN.WIDTH / 2 + (index - (CHARACTER_ROSTER.length - 1) / 2) * 300;
    const card = this.add.rectangle(x, 438, 260, 220, 0x0e1b35, 0.96).setStrokeStyle(2, definition.auraColorHex, 0.6);
    card.setInteractive({ useHandCursor: true });
    const mini = this.add.sprite(x - 72, 476, definition.spriteKey)
      .setDisplaySize(132, 88).setOrigin(0.5, 1);
    this.add.text(x + 30, 395, definition.displayName, { fontFamily: 'Arial Black, sans-serif', fontSize: '17px', color: '#eaf8ff' }).setOrigin(0.5);
    this.add.text(x + 30, 424, definition.title, { fontFamily: 'sans-serif', fontSize: '12px', color: '#8ea6c9' }).setOrigin(0.5);
    this.add.text(x + 30, 486, `HP ${definition.baseStats.maxHp}  •  ATK ${definition.baseStats.damage}\nจักระ ${definition.baseStats.maxChakra}  •  ความเร็ว ${Math.round(definition.baseStats.speedMultiplier * 100)}%`, { fontFamily: 'monospace', fontSize: '12px', color: '#b8c9e4', align: 'center', lineSpacing: 8 }).setOrigin(0.5);
    card.on('pointerover', () => this.selectIndex(index));
    card.on('pointerdown', () => this.startGame());
    this.cards.push(card);
    void mini;
  }

  private selectIndex(index: number): void {
    this.selectedIndex = (index + CHARACTER_ROSTER.length) % CHARACTER_ROSTER.length;
    this.refreshSelection();
  }

  private refreshSelection(): void {
    const definition = CHARACTER_ROSTER[this.selectedIndex];
    this.preview.setTexture(definition.spriteKey);
    this.cards.forEach((card, index) => card.setStrokeStyle(index === this.selectedIndex ? 3 : 2, CHARACTER_ROSTER[index].auraColorHex, index === this.selectedIndex ? 1 : 0.55).setFillStyle(index === this.selectedIndex ? 0x172b4d : 0x0e1b35));
  }

  private startGame(): void {
    this.registry.set('selectedCharacterId', CHARACTER_ROSTER[this.selectedIndex].id);
    this.scene.start('StageScene');
  }

  private createBackdrop(): void {
    this.cameras.main.setBackgroundColor('#07101f');
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x101d3a, 0x07101f, 0x07101f, 0x02050d, 1).fillRect(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT);
    graphics.fillStyle(0x64e6db, 0.08).fillCircle(SCREEN.WIDTH * 0.18, 170, 180);
    graphics.fillStyle(0x8b5cf6, 0.08).fillCircle(SCREEN.WIDTH * 0.84, 450, 260);
    graphics.lineStyle(1, 0x2b416d, 0.35);
    for (let i = 0; i < 18; i += 1) graphics.lineBetween(0, 170 + i * 28, SCREEN.WIDTH, 70 + i * 28);
  }
}

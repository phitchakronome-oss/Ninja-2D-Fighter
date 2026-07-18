import Phaser from 'phaser';
import { SCREEN } from '../config/GameConfig';
import { getCharacterDefinition } from '../data/characters';
import type { Direction, SkillSlot } from '../core/types';
import { Character, type PlayerHost } from '../entities/characters/Character';
import { Enemy, type EnemyHost, type EnemyKind } from '../entities/enemies/Enemy';
import { InputManager } from '../systems/InputManager';

const STAGE_WIDTH = 3200;
const GROUND_HEIGHT = 92;

type StageState = 'playing' | 'victory' | 'defeat';

export interface StageStatus {
  state: StageState;
  wave: number;
  waveTotal: number;
  remaining: number;
  boss: Enemy | undefined;
  message?: { message: string; color: string; at: number };
}

export class StageScene extends Phaser.Scene implements PlayerHost, EnemyHost {
  private player!: Character;
  private inputManager!: InputManager;
  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: Enemy[] = [];
  private wave = 0;
  private readonly waveTotal = 3;
  private waveTransitionPending = false;
  private boss?: Enemy;
  private state: StageState = 'playing';
  private restartKey!: Phaser.Input.Keyboard.Key;
  private playerAura?: Phaser.GameObjects.Graphics;

  constructor() {
    super('StageScene');
  }

  create(): void {
    const selectedId = (this.registry.get('selectedCharacterId') as string) ?? 'kaito';
    const definition = getCharacterDefinition(selectedId) ?? getCharacterDefinition('kaito')!;
    this.state = 'playing';
    this.wave = 0;
    this.enemies = [];
    this.boss = undefined;
    this.waveTransitionPending = false;

    this.cameras.main.setBackgroundColor('#07101f');
    this.physics.world.setBounds(0, 0, STAGE_WIDTH, SCREEN.HEIGHT);
    this.createBackdrop();
    this.createGround();
    this.createArenaDetails();

    this.inputManager = new InputManager(this);
    this.restartKey = this.input.keyboard!.addKey('R');
    this.player = new Character(this, 240, SCREEN.HEIGHT - GROUND_HEIGHT, definition, this.inputManager, this);
    this.physics.add.collider(this.player, this.groundGroup);
    this.cameras.main.setBounds(0, 0, STAGE_WIDTH, SCREEN.HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.spawnWave(1);
    this.scene.launch('UIScene');
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey) && this.state !== 'playing') {
      this.scene.stop('UIScene');
      this.scene.restart();
      return;
    }
    if (this.state !== 'playing') return;
    const frameDelta = Math.min(delta, 34);
    this.player.update(_time, frameDelta);
    this.playerAura?.setPosition(this.player.x, this.player.y - this.player.displayHeight * 0.48);
    this.enemies.forEach((enemy) => enemy.updateAI(this.player, frameDelta));

    if (!this.waveTransitionPending && this.enemies.length > 0 && this.enemies.every((enemy) => enemy.isDead())) {
      this.waveTransitionPending = true;
      if (this.wave < this.waveTotal) {
        this.time.delayedCall(850, () => {
          this.waveTransitionPending = false;
          this.spawnWave(this.wave + 1);
        });
      } else if (!this.boss) {
        this.time.delayedCall(900, () => this.spawnBoss());
      }
    }

    if (this.player.y > SCREEN.HEIGHT + 120) {
      this.player.setPosition(Math.max(120, this.player.x), SCREEN.HEIGHT - GROUND_HEIGHT);
      this.player.setVelocity(0, 0);
    }
  }

  getStatus(): StageStatus {
    return {
      state: this.state,
      wave: this.wave,
      waveTotal: this.waveTotal,
      remaining: this.enemies.filter((enemy) => !enemy.isDead()).length,
      boss: this.boss,
      message: this.registry.get('battleMessage') as StageStatus['message'],
    };
  }

  getPlayer(): Character { return this.player; }

  checkPlayerAttack(x: number, facing: Direction, damage: number, knockback: number, range: number): void {
    if (this.state !== 'playing') return;
    const direction = facing === 'right' ? 1 : -1;
    const targets = this.enemies.filter((enemy) => !enemy.isDead()
      && Math.abs(enemy.y - this.player.y) < 90
      && enemy.x * direction > x * direction
      && Math.abs(enemy.x - x) <= range);
    targets.forEach((enemy) => {
      if (enemy.takeDamage(damage, knockback, direction)) {
        this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 4);
        this.cameras.main.shake(70, 0.0025);
      }
    });
  }

  handlePlayerSkill(slot: SkillSlot, x: number, y: number, facing: Direction): void {
    if (this.state !== 'playing') return;
    const direction = facing === 'right' ? 1 : -1;
    const power = this.player.definition.baseStats.damage * (this.player.isTransformed ? 1.35 : 1);
    if (slot === 'skill1') {
      this.createWindOrbVfx(x, y, direction);
      this.damageEnemiesInArea(x + direction * 175, y, 210, power * 2.2, direction, 260);
      this.notifyPlayer('WIND ORB', '#64e6db');
    } else if (slot === 'skill2') {
      this.createShadowAlliesVfx(x, y, direction);
      this.damageEnemiesInArea(x + direction * 255, y, 290, power * 3.1, direction, 330);
      this.notifyPlayer('SHADOW ALLIES', '#c4b5fd');
    } else if (slot === 'skill3') {
      this.createStormFistVfx(x, y);
      this.damageEnemiesInArea(x, y, 300, power * 4.5, direction, 430);
      this.notifyPlayer('STORM FIST', '#fbbf24');
    } else if (slot === 'ultimate') {
      this.createUltimateVfx(this.player.x, this.player.y - 60);
      this.damageEnemiesInArea(this.player.x, this.player.y, 900, power * 8.5, direction, 680);
      this.cameras.main.flash(160, 210, 240, 255);
      this.cameras.main.shake(300, 0.012);
      this.notifyPlayer('ULTIMATE — GIANT WIND ORB', '#ffffff');
    }
  }

  damagePlayer(amount: number, sourceX: number, knockback: number): void {
    if (this.state === 'playing') this.player.takeDamage(amount, sourceX, knockback);
  }

  onEnemyDefeated(enemy: Enemy): void {
    this.player.kills += 1;
    this.player.gold += enemy.reward;
    this.player.addExp(enemy.reward);
    this.notifyPlayer(`+${enemy.reward} EXP   +${enemy.reward} เหรียญ`, '#8ef0c2');
    if (enemy === this.boss) {
      this.state = 'victory';
      this.notifyPlayer('MISSION COMPLETE', '#ffd166');
      this.time.delayedCall(450, () => this.showEndState(true));
    }
  }

  onPlayerDefeated(): void {
    if (this.state !== 'playing') return;
    this.state = 'defeat';
    this.notifyPlayer('คุณพ่ายแพ้ในสนามรบ', '#ff8fab');
    this.time.delayedCall(400, () => this.showEndState(false));
  }

  createHitBurst(x: number, y: number, color: number, big = false): void {
    const radius = big ? 26 : 12;
    const burst = this.add.graphics().setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    burst.lineStyle(big ? 4 : 2, color, 0.9);
    burst.strokeCircle(x, y, radius);
    for (let i = 0; i < (big ? 12 : 6); i += 1) {
      const angle = i * Math.PI / (big ? 6 : 3);
      burst.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, x + Math.cos(angle) * radius * 2.6, y + Math.sin(angle) * radius * 2.6);
    }
    this.tweens.add({ targets: burst, alpha: 0, scale: big ? 2.2 : 1.6, duration: big ? 520 : 260, onComplete: () => burst.destroy() });
  }

  notifyPlayer(message: string, color = '#eaf8ff'): void {
    this.registry.set('battleMessage', { message, color, at: this.time.now });
  }

  setPlayerAura(active: boolean, color: number): void {
    if (!active) {
      if (this.playerAura) {
        this.tweens.killTweensOf(this.playerAura);
        this.playerAura.destroy();
        this.playerAura = undefined;
      }
      return;
    }
    this.setPlayerAura(false, color);
    const aura = this.add.graphics().setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    aura.fillStyle(color, 0.12).fillEllipse(0, 0, 112, 184);
    aura.lineStyle(4, color, 0.7).strokeEllipse(0, 0, 118, 190);
    aura.lineStyle(2, 0xffffff, 0.42).strokeEllipse(0, 0, 92, 158);
    this.playerAura = aura;
    this.tweens.add({ targets: aura, scaleX: 1.12, scaleY: 1.06, alpha: 0.62, duration: 430, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private spawnWave(wave: number): void {
    this.wave = wave;
    const layout: EnemyKind[] = wave === 1 ? ['scout', 'scout', 'brute'] : wave === 2 ? ['scout', 'scout', 'brute', 'brute'] : ['scout', 'brute', 'brute', 'scout', 'brute'];
    this.notifyPlayer(`WAVE ${wave} / ${this.waveTotal} — เงาศัตรูกำลังบุก`, '#8ea6c9');
    layout.forEach((kind, index) => {
      const x = 720 + index * 310 + wave * 90;
      const enemy = new Enemy(this, x, SCREEN.HEIGHT - GROUND_HEIGHT, kind, this);
      this.enemies.push(enemy);
      this.physics.add.collider(enemy, this.groundGroup);
      this.createPortal(x, SCREEN.HEIGHT - GROUND_HEIGHT - 30, kind === 'brute' ? 0xff6f91 : 0x64e6db);
    });
  }

  private spawnBoss(): void {
    this.waveTransitionPending = true;
    this.notifyPlayer('BOSS APPROACHING — KAGE LORD', '#d8b4fe');
    this.cameras.main.shake(450, 0.008);
    const boss = new Enemy(this, 2520, SCREEN.HEIGHT - GROUND_HEIGHT, 'boss', this);
    this.boss = boss;
    this.enemies.push(boss);
    this.physics.add.collider(boss, this.groundGroup);
    this.createPortal(boss.x, boss.y - 45, 0xd8b4fe, true);
  }

  private damageEnemiesInArea(x: number, y: number, radius: number, damage: number, direction: 1 | -1, knockback: number): void {
    this.enemies.filter((enemy) => !enemy.isDead() && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius)
      .forEach((enemy) => enemy.takeDamage(damage, knockback, direction));
  }

  private createWindOrbVfx(x: number, y: number, direction: 1 | -1): void {
    const orb = this.add.graphics().setPosition(x, y).setDepth(36).setBlendMode(Phaser.BlendModes.ADD);
    orb.fillStyle(0xb9fff7, 0.38).fillCircle(0, 0, 24);
    orb.lineStyle(5, 0x64e6db, 0.95).strokeCircle(0, 0, 31);
    orb.lineStyle(2, 0xe7fffc, 0.75).strokeCircle(0, 0, 40);
    for (let i = 0; i < 6; i += 1) orb.lineBetween(-58 - i * 12, (i % 2) * 12 - 6, -26, 0);
    orb.scaleX = direction;
    this.tweens.add({
      targets: orb, x: x + direction * 360, angle: direction * 220, scaleX: direction * 1.35, scaleY: 1.35,
      alpha: 0, duration: 330, ease: 'Cubic.easeOut', onComplete: () => orb.destroy(),
    });
  }

  private createShadowAlliesVfx(x: number, y: number, direction: 1 | -1): void {
    for (let index = 0; index < 3; index += 1) {
      const echo = this.add.image(x - direction * index * 34, y + 58 - index * 8, this.player.texture.key)
        .setDisplaySize(this.player.displayWidth, this.player.displayHeight)
        .setOrigin(0.5, 1).setFlipX(direction < 0).setTint(0x8b5cf6)
        .setAlpha(0.42 - index * 0.08).setDepth(34 - index).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: echo, x: x + direction * (310 + index * 52), alpha: 0, scaleX: echo.scaleX * 0.84,
        duration: 360 + index * 45, delay: index * 35, ease: 'Cubic.easeOut', onComplete: () => echo.destroy(),
      });
    }
  }

  private createStormFistVfx(x: number, y: number): void {
    const storm = this.add.graphics().setPosition(x, y).setDepth(36).setBlendMode(Phaser.BlendModes.ADD);
    storm.fillStyle(0xf59e0b, 0.16).fillCircle(0, 0, 120);
    storm.lineStyle(7, 0xffd166, 0.9).strokeCircle(0, 0, 76);
    storm.lineStyle(3, 0xffffff, 0.8).strokeCircle(0, 0, 112);
    for (let index = 0; index < 10; index += 1) {
      const angle = index * Math.PI / 5;
      storm.lineBetween(Math.cos(angle) * 28, Math.sin(angle) * 28, Math.cos(angle) * 160, Math.sin(angle) * 160);
    }
    this.tweens.add({ targets: storm, angle: 145, scale: 1.8, alpha: 0, duration: 430, ease: 'Quad.easeOut', onComplete: () => storm.destroy() });
  }

  private createUltimateVfx(x: number, y: number): void {
    const core = this.add.graphics().setPosition(x, y).setDepth(38).setBlendMode(Phaser.BlendModes.ADD);
    core.fillStyle(0xdffcff, 0.32).fillCircle(0, 0, 90);
    core.lineStyle(10, 0x64e6db, 0.95).strokeCircle(0, 0, 118);
    core.lineStyle(4, 0xffffff, 0.92).strokeCircle(0, 0, 165);
    core.lineStyle(3, 0x8b5cf6, 0.75).strokeCircle(0, 0, 215);
    for (let index = 0; index < 14; index += 1) {
      const angle = index * Math.PI / 7;
      core.lineBetween(Math.cos(angle) * 40, Math.sin(angle) * 40, Math.cos(angle) * 260, Math.sin(angle) * 260);
    }
    this.tweens.add({ targets: core, angle: 260, scale: 3.1, alpha: 0, duration: 720, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
  }

  private createPortal(x: number, y: number, color: number, huge = false): void {
    const portal = this.add.graphics().setDepth(5);
    portal.lineStyle(huge ? 6 : 3, color, 0.75).strokeEllipse(x, y, huge ? 120 : 70, huge ? 170 : 105);
    this.tweens.add({ targets: portal, scale: 1.2, alpha: 0, duration: huge ? 1200 : 520, onComplete: () => portal.destroy() });
  }

  private showEndState(victory: boolean): void {
    this.registry.set('endState', { victory, at: this.time.now });
  }

  private createBackdrop(): void {
    const sky = this.add.rectangle(STAGE_WIDTH / 2, SCREEN.HEIGHT / 2, STAGE_WIDTH, SCREEN.HEIGHT, 0x091227).setDepth(-20);
    sky.setScrollFactor(1);
    const far = this.add.graphics().setDepth(-15).setScrollFactor(0.35);
    far.fillStyle(0x17264a, 1);
    for (let x = -200; x < STAGE_WIDTH + 400; x += 230) {
      far.fillTriangle(x, 520, x + 130, 220 + (x % 80), x + 280, 520);
    }
    const near = this.add.graphics().setDepth(-10).setScrollFactor(0.6);
    near.fillStyle(0x101d3a, 1);
    for (let x = -100; x < STAGE_WIDTH + 300; x += 180) near.fillTriangle(x, 590, x + 90, 340 + (x % 120), x + 220, 590);
    const stars = this.add.graphics().setDepth(-5).setScrollFactor(0.25);
    stars.fillStyle(0x8be9fd, 0.7);
    for (let i = 0; i < 80; i += 1) stars.fillCircle((i * 193) % STAGE_WIDTH, 50 + ((i * 67) % 330), (i % 3) + 1);
  }

  private createGround(): void {
    this.groundGroup = this.physics.add.staticGroup();
    const key = 'stage_ground';
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillGradientStyle(0x253354, 0x253354, 0x101a31, 0x101a31, 1);
      g.fillRect(0, 0, STAGE_WIDTH, GROUND_HEIGHT);
      g.lineStyle(3, 0x52e0c4, 0.8).lineBetween(0, 3, STAGE_WIDTH, 3);
      g.lineStyle(1, 0x36527d, 0.65);
      for (let x = 0; x < STAGE_WIDTH; x += 96) g.lineBetween(x, 30, x + 42, GROUND_HEIGHT);
      g.generateTexture(key, STAGE_WIDTH, GROUND_HEIGHT);
      g.destroy();
    }
    const ground = this.groundGroup.create(STAGE_WIDTH / 2, SCREEN.HEIGHT - GROUND_HEIGHT / 2, key) as Phaser.Physics.Arcade.Sprite;
    (ground.body as Phaser.Physics.Arcade.StaticBody).setSize(STAGE_WIDTH, GROUND_HEIGHT);
    ground.refreshBody();
  }

  private createArenaDetails(): void {
    const graphics = this.add.graphics().setDepth(1);
    for (let x = 120; x < STAGE_WIDTH; x += 320) {
      graphics.fillStyle(0x1b2d52, 1).fillRect(x, SCREEN.HEIGHT - GROUND_HEIGHT - 150, 10, 150);
      graphics.fillStyle(0x52e0c4, 0.65).fillCircle(x + 5, SCREEN.HEIGHT - GROUND_HEIGHT - 155, 8);
      graphics.lineStyle(2, 0x34547f, 0.5).strokeRect(x - 30, SCREEN.HEIGHT - GROUND_HEIGHT - 105, 70, 38);
    }
  }
}

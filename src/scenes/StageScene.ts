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
  private nextRunDustAt = 0;

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
    this.nextRunDustAt = 0;
    this.registry.remove('endState');
    this.registry.remove('battleMessage');

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
    if (this.player.getCurrentState() === 'run' && this.time.now >= this.nextRunDustAt) {
      this.createMovementDust(this.player.x, this.player.y - 2, this.player.getFacing());
      this.nextRunDustAt = this.time.now + 95;
    }
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

  createDamageNumber(x: number, y: number, amount: number, critical = false): void {
    const label = this.add.text(x + Phaser.Math.Between(-10, 10), y, `${Math.round(amount)}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: critical ? '25px' : '18px',
      color: critical ? '#fff1a8' : '#ffffff',
      stroke: critical ? '#9a4d00' : '#07101f',
      strokeThickness: critical ? 6 : 4,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: label,
      y: y - (critical ? 72 : 48),
      x: label.x + Phaser.Math.Between(-16, 16),
      scale: critical ? 1.18 : 1,
      alpha: 0,
      duration: critical ? 720 : 520,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
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
    const orb = this.add.sprite(x, y, 'vfx_wind_orb_sheet', 0)
      .setDisplaySize(118, 118)
      .setDepth(36)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play('wind_orb_spin');
    const destinationX = x + direction * 360;
    this.tweens.add({
      targets: orb,
      x: destinationX,
      angle: direction * 180,
      scaleX: orb.scaleX * 1.22,
      scaleY: orb.scaleY * 1.22,
      duration: 330,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        orb.destroy();
        const impact = this.add.sprite(destinationX, y, 'vfx_wind_orb_sheet', 15)
          .setDisplaySize(170, 170)
          .setDepth(37)
          .setBlendMode(Phaser.BlendModes.ADD)
          .play('wind_orb_impact');
        impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy());
      },
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
    this.add.image(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 'stage_moon_valley')
      .setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT)
      .setScrollFactor(0)
      .setDepth(-30);
    const near = this.add.graphics().setDepth(-10).setScrollFactor(0.72);
    near.fillStyle(0x06101f, 0.72);
    for (let x = -180; x < STAGE_WIDTH + 300; x += 260) {
      near.fillTriangle(x, 625, x + 115, 430 + (x % 95), x + 290, 625);
    }
    const mist = this.add.graphics().setDepth(-6).setScrollFactor(0.45);
    mist.fillStyle(0x7fe7ef, 0.055);
    for (let x = -100; x < STAGE_WIDTH + 400; x += 310) mist.fillEllipse(x, 520 + (x % 45), 420, 74);
    const stars = this.add.graphics().setDepth(-5).setScrollFactor(0.25);
    stars.fillStyle(0xbffaff, 0.42);
    for (let i = 0; i < 42; i += 1) stars.fillCircle((i * 193) % STAGE_WIDTH, 45 + ((i * 67) % 260), (i % 2) + 1);
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

  private createMovementDust(x: number, y: number, facing: Direction): void {
    const direction = facing === 'right' ? -1 : 1;
    const dust = this.add.graphics().setPosition(x + direction * 12, y).setDepth(11);
    dust.fillStyle(0x8edee5, 0.18);
    dust.fillCircle(-10, 0, 7);
    dust.fillCircle(2, -3, 5);
    dust.fillCircle(12, 1, 4);
    this.tweens.add({
      targets: dust,
      x: dust.x + direction * 34,
      y: y - 13,
      scaleX: 1.6,
      scaleY: 0.72,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => dust.destroy(),
    });
  }
}

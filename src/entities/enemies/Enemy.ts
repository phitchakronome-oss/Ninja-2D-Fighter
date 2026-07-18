import Phaser from 'phaser';
import type { Direction } from '../../core/types';

export type EnemyKind = 'scout' | 'brute' | 'boss';

export interface EnemyHost {
  damagePlayer(amount: number, sourceX: number, knockback: number): void;
  onEnemyDefeated(enemy: Enemy): void;
  createHitBurst(x: number, y: number, color: number, big?: boolean): void;
  createDamageNumber(x: number, y: number, amount: number, critical?: boolean): void;
}

interface EnemyStat {
  hp: number;
  damage: number;
  speed: number;
  reward: number;
  texture: string;
  animationTexture?: string;
  displayHeight: number;
  bodyWidthRatio: number;
  bodyHeightRatio: number;
  bodyOffsetX: number;
  bodyOffsetY: number;
}

const ENEMY_STATS: Record<EnemyKind, EnemyStat> = {
  scout: {
    hp: 55, damage: 8, speed: 142, reward: 35, texture: 'enemy_scout', animationTexture: 'enemy_scout_sheet', displayHeight: 168,
    bodyWidthRatio: 0.32, bodyHeightRatio: 0.62, bodyOffsetX: 0.34, bodyOffsetY: 0.32,
  },
  brute: {
    hp: 135, damage: 15, speed: 70, reward: 80, texture: 'enemy_brute', animationTexture: 'enemy_brute_sheet', displayHeight: 224,
    bodyWidthRatio: 0.34, bodyHeightRatio: 0.65, bodyOffsetX: 0.33, bodyOffsetY: 0.31,
  },
  boss: {
    hp: 820, damage: 22, speed: 94, reward: 500, texture: 'enemy_boss', displayHeight: 306,
    bodyWidthRatio: 0.3, bodyHeightRatio: 0.7, bodyOffsetX: 0.35, bodyOffsetY: 0.26,
  },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly maxHp: number;
  readonly reward: number;
  hp: number;

  private readonly damage: number;
  private readonly moveSpeed: number;
  private readonly host: EnemyHost;
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;
  private readonly barWidth: number;
  private readonly healthBarBg: Phaser.GameObjects.Rectangle;
  private readonly healthBarFill: Phaser.GameObjects.Rectangle;
  private attackCooldown = 650;
  private attackWindup = 0;
  private hitStun = 0;
  private dead = false;
  private phase = 1;
  private facing: Direction = 'left';
  private readonly hasFrameAnimations: boolean;
  private currentAnimation = '';
  private attackTelegraph?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind, host: EnemyHost) {
    const stat = ENEMY_STATS[kind];
    super(scene, x, y, stat.animationTexture ?? stat.texture, 0);
    this.kind = kind;
    this.maxHp = stat.hp;
    this.hp = stat.hp;
    this.reward = stat.reward;
    this.damage = stat.damage;
    this.moveSpeed = stat.speed;
    this.host = host;
    this.hasFrameAnimations = Boolean(stat.animationTexture);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(kind === 'boss' ? 14 : 12);
    this.setDisplaySize(stat.displayHeight * (this.width / this.height), stat.displayHeight);
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;
    this.setCollideWorldBounds(true).setDragX(900);
    this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * stat.bodyWidthRatio, this.height * stat.bodyHeightRatio);
    body.setOffset(this.width * stat.bodyOffsetX, this.height * stat.bodyOffsetY);

    this.barWidth = kind === 'boss' ? 160 : kind === 'brute' ? 82 : 68;
    this.healthBarBg = scene.add.rectangle(0, 0, this.barWidth, 8, 0x07101f, 0.9)
      .setOrigin(0, 0.5).setStrokeStyle(1, 0x456082, 0.8).setDepth(30);
    this.healthBarFill = scene.add.rectangle(0, 0, this.barWidth - 2, 5, kind === 'boss' ? 0xd8b4fe : 0x52e0c4)
      .setOrigin(0, 0.5).setDepth(31);

    if (this.hasFrameAnimations) this.playState('idle');
    else scene.tweens.add({
      targets: this,
      scaleY: this.baseScaleY * 1.012,
      duration: kind === 'boss' ? 1150 : 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  updateAI(player: Phaser.Physics.Arcade.Sprite, delta: number): void {
    if (this.dead) return;
    this.attackCooldown -= delta;
    this.hitStun = Math.max(0, this.hitStun - delta);

    if (this.attackWindup > 0) {
      this.attackWindup -= delta;
      this.setVelocityX(0);
      if (!this.hasFrameAnimations) this.angle = Math.sin(this.scene.time.now * 0.045) * 2.5;
      const hitRange = this.kind === 'boss' ? 235 : this.kind === 'brute' ? 185 : 145;
      if (this.attackWindup <= 0 && this.distanceSquaredTo(player) < hitRange * hitRange) {
        this.host.damagePlayer(this.damage * this.phase, this.x, this.kind === 'brute' ? 360 : 250);
        this.host.createHitBurst(player.x, player.y - 55, this.kind === 'boss' ? 0xd8b4fe : 0xff9fba);
        this.angle = 0;
        this.playState('idle');
      }
      this.updateHealthBar();
      return;
    }

    if (this.hitStun > 0) {
      this.setVelocityX((this.body as Phaser.Physics.Arcade.Body).velocity.x * 0.72);
      this.playState('idle');
      this.updateHealthBar();
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distanceSquared = dx * dx + dy * dy;
    const direction: 1 | -1 = dx >= 0 ? 1 : -1;
    this.facing = direction > 0 ? 'right' : 'left';
    // Enemy animation sheets are authored facing left. Flip only while moving right.
    this.setFlipX(direction > 0);

    const attackRange = this.kind === 'boss' ? 215 : this.kind === 'brute' ? 168 : 132;
    if (distanceSquared > attackRange * attackRange) {
      this.setVelocityX(direction * this.moveSpeed * (this.phase === 2 ? 1.18 : 1));
      this.playState('run');
      if (!this.hasFrameAnimations) this.angle = Math.sin(this.scene.time.now * 0.013 + this.x * 0.01) * (this.kind === 'brute' ? 0.8 : 1.8);
    } else {
      this.setVelocityX(0);
      this.angle = 0;
      if (this.attackCooldown <= 0) this.beginAttack(); else this.playState('idle');
    }

    if (this.kind === 'boss' && this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.attackCooldown = 250;
      this.setTint(0xe9d5ff);
      this.host.createHitBurst(this.x, this.y - 150, 0xd8b4fe, true);
    }
    this.updateHealthBar();
  }

  takeDamage(amount: number, knockback: number, direction: 1 | -1, critical = false): boolean {
    if (this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.kind !== 'boss' && this.attackWindup > 0) {
      this.attackWindup = 0;
      this.clearAttackTelegraph();
      this.playState('idle', true);
    }
    this.hitStun = this.kind === 'boss' ? 75 : 145;
    this.setVelocityX(direction * knockback);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(72, () => {
      if (!this.dead) this.setTint(this.phase === 2 ? 0xe9d5ff : 0xffffff);
      if (!this.dead && this.phase === 1) this.clearTint();
    });
    this.host.createHitBurst(this.x, this.y - this.displayHeight * 0.48, this.kind === 'boss' ? 0xf0abfc : 0xffd166);
    this.host.createDamageNumber(this.x, this.y - this.displayHeight * 0.72, amount, critical);
    if (this.hp <= 0) this.defeat();
    return true;
  }

  isDead(): boolean { return this.dead; }

  private beginAttack(): void {
    this.attackCooldown = this.kind === 'boss' ? 920 : this.kind === 'brute' ? 1080 : 760;
    this.attackWindup = this.kind === 'boss' ? 300 : this.kind === 'brute' ? 245 : 175;
    this.playState('attack', true);
    this.createAttackTelegraph();
    this.setTint(this.kind === 'boss' ? 0xd8b4fe : 0xffd8a8);
    this.scene.time.delayedCall(105, () => {
      if (!this.dead && this.phase === 1) this.clearTint();
      else if (!this.dead) this.setTint(0xe9d5ff);
    });
  }

  private playState(state: 'idle' | 'run' | 'attack', force = false): void {
    if (!this.hasFrameAnimations) return;
    const key = `enemy_${this.kind}_${state}`;
    if (!this.scene.anims.exists(key) || (!force && this.currentAnimation === key)) return;
    this.currentAnimation = key;
    this.play(key, true);
  }

  private createAttackTelegraph(): void {
    this.clearAttackTelegraph();
    const color = this.kind === 'boss' ? 0xd8b4fe : this.kind === 'brute' ? 0xff8a66 : 0xffd166;
    const ring = this.scene.add.graphics().setPosition(this.x, this.y - 6).setDepth(9);
    this.attackTelegraph = ring;
    ring.lineStyle(this.kind === 'boss' ? 6 : 3, color, 0.8).strokeEllipse(0, 0, this.kind === 'boss' ? 190 : 112, 34);
    ring.fillStyle(color, 0.08).fillEllipse(0, 0, this.kind === 'boss' ? 180 : 102, 28);
    ring.setScale(0.35).setAlpha(0.25);
    this.scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0.92,
      duration: Math.max(120, this.attackWindup),
      ease: 'Cubic.easeOut',
      onComplete: () => this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        duration: 90,
        onComplete: () => {
          if (this.attackTelegraph === ring) this.attackTelegraph = undefined;
          ring.destroy();
        },
      }),
    });
  }

  private clearAttackTelegraph(): void {
    if (!this.attackTelegraph) return;
    this.scene.tweens.killTweensOf(this.attackTelegraph);
    this.attackTelegraph.destroy();
    this.attackTelegraph = undefined;
  }

  private distanceSquaredTo(target: Phaser.GameObjects.Components.Transform): number {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    return dx * dx + dy * dy;
  }

  private defeat(): void {
    if (this.dead) return;
    this.dead = true;
    this.clearAttackTelegraph();
    this.scene.tweens.killTweensOf(this);
    this.setVelocity(0, -240);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.none = true;
    this.healthBarBg.setVisible(false);
    this.healthBarFill.setVisible(false);
    this.host.createHitBurst(this.x, this.y - this.displayHeight * 0.45, this.kind === 'boss' ? 0xd8b4fe : 0x6ee7ff, this.kind === 'boss');
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: this.facing === 'right' ? 70 : -70,
      scaleX: this.baseScaleX * 0.82,
      scaleY: this.baseScaleY * 0.82,
      duration: this.kind === 'boss' ? 950 : 460,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.healthBarBg.destroy();
        this.healthBarFill.destroy();
        this.destroy();
        this.host.onEnemyDefeated(this);
      },
    });
  }

  private updateHealthBar(): void {
    const y = this.y - this.displayHeight * 0.9;
    const x = this.x - this.barWidth / 2;
    this.healthBarBg.setPosition(x, y);
    this.healthBarFill.setPosition(x + 1, y);
    this.healthBarFill.displayWidth = Math.max(0, (this.barWidth - 2) * (this.hp / this.maxHp));
  }
}

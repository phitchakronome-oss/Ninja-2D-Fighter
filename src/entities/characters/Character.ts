import Phaser from 'phaser';
import { COMBAT, PHYSICS, DASH_DOUBLE_TAP_WINDOW_MS, COOLDOWN_MS, CHAKRA, DEFAULT_GAME_SETTINGS, type GameSettings } from '../../config/GameConfig';
import type { CharacterDefinition, Direction, SkillSlot } from '../../core/types';
import { StateMachine } from '../../core/StateMachine';
import { InputManager } from '../../systems/InputManager';
import { AnimationController } from '../../systems/AnimationController';

export interface PlayerHost {
  checkPlayerAttack(x: number, facing: Direction, damage: number, knockback: number, range: number, combo: number): void;
  handlePlayerSkill(slot: SkillSlot, x: number, y: number, facing: Direction): void;
  onPlayerDefeated(): void;
  createHitBurst(x: number, y: number, color: number, big?: boolean): void;
  notifyPlayer(message: string, color?: string): void;
  setPlayerAura(active: boolean, color: number): void;
  setPlayerCharging(active: boolean, color: number): void;
}

export class Character extends Phaser.Physics.Arcade.Sprite {
  readonly definition: CharacterDefinition;
  readonly maxHp: number;
  readonly maxChakra: number;
  hp: number;
  chakra: number;
  level = 1;
  exp = 0;
  gold = 0;
  kills = 0;
  combo = 0;
  isTransformed = false;

  protected readonly inputManager: InputManager;
  protected readonly stateMachine = new StateMachine();
  protected readonly animController: AnimationController;
  protected facing: Direction = 'right';

  private readonly host: PlayerHost;
  private readonly gameSettings: GameSettings;
  private readonly groundY: number;
  private jumpsUsed = 0;
  private readonly maxJumps = 2;
  private isDashing = false;
  private dashTimeRemainingMs = 0;
  private dashDirection: 1 | -1 = 1;
  private leftTapWindowMs = 0;
  private rightTapWindowMs = 0;
  private actionLockMs = 0;
  private attackHitDone = false;
  private comboExpireAt = 0;
  private attackBuffered = false;
  private invulnerableMs = 0;
  private transformMs = 0;
  private coyoteMs = 0;
  private jumpBufferMs = 0;
  private wasOnGround = false;
  private charging = false;
  private nextChargePulseAt = 0;
  private readonly cooldowns: Record<SkillSlot, number> = {
    skill1: 0, skill2: 0, skill3: 0, ultimate: 0, transform: 0,
  };

  constructor(scene: Phaser.Scene, x: number, groundY: number, definition: CharacterDefinition, inputManager: InputManager, host: PlayerHost) {
    super(scene, x, groundY, definition.spriteKey);
    this.definition = definition;
    this.host = host;
    this.inputManager = inputManager;
    this.groundY = groundY;
    this.maxHp = definition.baseStats.maxHp;
    this.maxChakra = definition.baseStats.maxChakra;
    this.gameSettings = { ...DEFAULT_GAME_SETTINGS, ...(scene.registry.get('gameSettings') as Partial<GameSettings> | undefined) };
    this.hp = this.maxHp;
    this.chakra = this.gameSettings.infiniteChakra ? this.maxChakra : 35;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(230, 154).setOrigin(0.5, 1).setDepth(15);
    this.setCollideWorldBounds(true).setDragX(1500).setMaxVelocity(PHYSICS.DASH_SPEED, 1400);
    this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.14, this.height * 0.63);
    body.setOffset(this.width * 0.43, this.height * 0.31);
    this.animController = new AnimationController(scene, this, definition.id);
    this.registerStates();
    this.stateMachine.transition('idle');
  }

  update(_time: number, delta: number): void {
    if (this.hp <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    let onGround = body.blocked.down || body.touching.down || (this.y >= this.groundY - 1.5 && body.velocity.y >= 0);
    if (this.y > this.groundY || (onGround && this.y > this.groundY - 1)) {
      this.setY(this.groundY);
      if (body.velocity.y > 0) this.setVelocityY(0);
      body.updateFromGameObject();
      onGround = true;
    }
    if (onGround && !this.wasOnGround && body.velocity.y >= 0) {
      this.animController.playLandingSquash();
      this.host.createHitBurst(this.x, this.y - 2, 0x82dff3);
      this.stateMachine.transition(Math.abs(body.velocity.x) > 20 ? 'run' : 'idle');
    }
    this.coyoteMs = onGround ? 110 : Math.max(0, this.coyoteMs - delta);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - delta);
    if (this.inputManager.justDown('JUMP')) this.jumpBufferMs = 130;
    if (this.inputManager.justDown('ATTACK')) this.attackBuffered = true;
    this.invulnerableMs = Math.max(0, this.invulnerableMs - delta);
    this.actionLockMs = Math.max(0, this.actionLockMs - delta);
    this.transformMs = Math.max(0, this.transformMs - delta);
    this.chakra = this.gameSettings.infiniteChakra
      ? this.maxChakra
      : Math.min(this.maxChakra, this.chakra + CHAKRA.REGEN_PER_SEC * delta / 1000);
    (Object.keys(this.cooldowns) as SkillSlot[]).forEach((slot) => {
      this.cooldowns[slot] = Math.max(0, this.cooldowns[slot] - delta);
    });

    if (this.transformMs <= 0 && this.isTransformed) {
      this.isTransformed = false;
      this.animController.setVariant('base');
      this.host.setPlayerAura(false, this.definition.auraColorHex);
      this.host.notifyPlayer('โหมดจักระสิ้นสุดลงแล้ว', '#93a4c4');
    }

    if (onGround) this.jumpsUsed = 0;
    const wantsCharge = this.inputManager.isDown('CHARGE') && onGround && this.actionLockMs <= 0 && !this.isDashing;
    if (wantsCharge) {
      this.updateCharging(delta);
    } else if (this.charging) {
      this.stopCharging();
    }

    if (this.charging) {
      this.setVelocityX(0);
    } else if (this.isDashing) {
      this.updateDash(delta);
    } else if (this.actionLockMs <= 0) {
      this.handleHorizontalMovement(delta);
      this.handleJumpInput(onGround);
      this.handleDashInput(delta);
      this.handleAttackInput();
      this.handleSkillInput();
    } else {
      this.setVelocityX((this.body as Phaser.Physics.Arcade.Body).velocity.x * 0.78);
      this.resolveAttackHit();
      if (this.attackBuffered && this.actionLockMs <= 85 && this.stateMachine.state?.startsWith('attack')) {
        this.actionLockMs = 0;
        this.handleAttackInput();
      }
    }

    this.updateMotionState(onGround);
    this.stateMachine.update(delta);
    this.wasOnGround = onGround;
  }

  getCurrentState(): string { return this.stateMachine.state ?? 'idle'; }
  getFacing(): Direction { return this.facing; }
  getCooldown(slot: SkillSlot): number { return this.cooldowns[slot]; }
  hasInfiniteChakra(): boolean { return this.gameSettings.infiniteChakra; }
  isInvincible(): boolean { return this.gameSettings.invincible; }
  hasZeroCooldown(): boolean { return this.gameSettings.zeroCooldown; }
  isChargingChakra(): boolean { return this.charging; }
  getExpToNextLevel(): number { return Math.floor(100 * Math.pow(1.18, this.level - 1)); }

  takeDamage(rawAmount: number, sourceX: number, knockback: number): void {
    if (this.hp <= 0 || this.invulnerableMs > 0 || this.isDashing) return;
    if (this.gameSettings.invincible) {
      this.hp = this.maxHp;
      return;
    }
    this.stopCharging();
    const defense = this.definition.baseStats.defense + (this.isTransformed ? 7 : 0);
    const amount = Math.max(1, Math.round(rawAmount - defense * 0.55));
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableMs = COMBAT.INVINCIBLE_AFTER_HIT_MS;
    this.setVelocityX(this.x >= sourceX ? knockback : -knockback);
    this.stateMachine.transition('hurt');
    this.host.createHitBurst(this.x, this.y - 50, 0xff6688);
    if (this.hp <= 0) {
      this.stateMachine.transition('dead');
      this.setVelocity(0, -250);
      this.host.onPlayerDefeated();
    }
  }

  addExp(amount: number): void {
    this.exp += amount;
    while (this.exp >= this.getExpToNextLevel()) {
      this.exp -= this.getExpToNextLevel();
      this.level += 1;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      this.chakra = this.maxChakra;
      this.host.createHitBurst(this.x, this.y - 60, 0xffd166, true);
      this.host.notifyPlayer(`LEVEL UP!  เลเวล ${this.level}`, '#ffd166');
    }
  }

  private registerStates(): void {
    const play = (state: Parameters<AnimationController['play']>[0]) => this.animController.play(state, { facing: this.facing, force: true });
    this.stateMachine
      .addState('idle', { onEnter: () => { this.clearTint(); play('idle'); } })
      .addState('run', { onEnter: () => play('run') })
      .addState('jump', { onEnter: () => play('jump') })
      .addState('fall', { onEnter: () => play('fall') })
      .addState('dash', { onEnter: () => { this.isDashing = true; this.dashTimeRemainingMs = PHYSICS.DASH_DURATION_MS; play('dash'); } })
      .addState('charge', { onEnter: () => play('charge') })
      .addState('skill', { onEnter: () => play('skill') })
      .addState('attack1', { onEnter: () => { this.attackHitDone = false; play('attack1'); } })
      .addState('attack2', { onEnter: () => { this.attackHitDone = false; play('attack2'); } })
      .addState('attack3', { onEnter: () => { this.attackHitDone = false; play('attack3'); } })
      .addState('hurt', { onEnter: () => { this.actionLockMs = 240; this.setTint(0xff6688); play('hurt'); this.scene.time.delayedCall(120, () => { if (this.hp > 0) this.clearTint(); }); } })
      .addState('dead', { onEnter: () => { this.actionLockMs = 99999; play('dead'); } });
  }

  private handleHorizontalMovement(delta: number): void {
    const left = this.inputManager.isDown('LEFT');
    const right = this.inputManager.isDown('RIGHT');
    const speed = (this.isTransformed ? 1.16 : 1) * PHYSICS.WALK_SPEED * this.definition.baseStats.speedMultiplier;
    const current = (this.body as Phaser.Physics.Arcade.Body).velocity.x;
    const blend = Math.min(1, delta * 0.025);
    if (left && !right) { this.setVelocityX(Phaser.Math.Linear(current, -speed, blend)); this.facing = 'left'; this.setFlipX(true); }
    else if (right && !left) { this.setVelocityX(Phaser.Math.Linear(current, speed, blend)); this.facing = 'right'; this.setFlipX(false); }
    else this.setVelocityX(Phaser.Math.Linear(current, 0, Math.min(1, delta * 0.04)));
  }

  private handleJumpInput(onGround: boolean): void {
    if (this.jumpBufferMs <= 0 || this.jumpsUsed >= this.maxJumps) return;
    const canGroundJump = onGround || this.coyoteMs > 0;
    const useFirstJump = canGroundJump && this.jumpsUsed === 0;
    this.setVelocityY(useFirstJump ? PHYSICS.JUMP_VELOCITY : PHYSICS.DOUBLE_JUMP_VELOCITY);
    this.jumpsUsed = useFirstJump ? 1 : this.maxJumps;
    this.jumpBufferMs = 0;
    this.coyoteMs = 0;
    this.host.createHitBurst(this.x, this.y - 4, 0x6ee7ff);
  }

  private handleDashInput(delta: number): void {
    this.leftTapWindowMs = Math.max(0, this.leftTapWindowMs - delta);
    this.rightTapWindowMs = Math.max(0, this.rightTapWindowMs - delta);
    if (this.inputManager.justDown('LEFT')) {
      if (this.leftTapWindowMs > 0) this.startDash(-1); else this.leftTapWindowMs = DASH_DOUBLE_TAP_WINDOW_MS;
    }
    if (this.inputManager.justDown('RIGHT')) {
      if (this.rightTapWindowMs > 0) this.startDash(1); else this.rightTapWindowMs = DASH_DOUBLE_TAP_WINDOW_MS;
    }
  }

  private handleAttackInput(): void {
    const now = this.scene.time.now;
    if (now > this.comboExpireAt) this.combo = 0;
    if (this.attackBuffered) {
      this.attackBuffered = false;
      this.combo = this.combo >= 3 ? 1 : this.combo + 1;
      this.comboExpireAt = now + COMBAT.COMBO_RESET_TIME_MS;
      const state = `attack${this.combo}` as 'attack1' | 'attack2' | 'attack3';
      this.actionLockMs = this.combo === 3 ? 410 : 335;
      const lunge = this.combo === 3 ? 185 : this.combo === 2 ? 135 : 95;
      this.setVelocityX((this.facing === 'right' ? 1 : -1) * lunge);
      this.stateMachine.transition(state);
      this.host.notifyPlayer(this.combo === 3 ? 'FINISHER!' : `คอมโบ ${this.combo}`, this.combo === 3 ? '#ffbd69' : '#eaf8ff');
    }
    this.resolveAttackHit();
  }

  private resolveAttackHit(): void {
    if (this.attackHitDone || !this.stateMachine.state?.startsWith('attack')) return;
    const startLock = this.combo === 3 ? 410 : 335;
    const hitAt = this.combo === 3 ? 220 : this.combo === 2 ? 170 : 165;
    if (this.actionLockMs <= startLock - hitAt) {
      this.attackHitDone = true;
      const damage = (this.definition.baseStats.damage + this.combo * 6) * (this.isTransformed ? 1.35 : 1);
      this.host.checkPlayerAttack(this.x, this.facing, damage, this.combo === 3 ? 420 : 240, this.combo === 3 ? 180 : 135, this.combo);
      this.chakra = Math.min(this.maxChakra, this.chakra + CHAKRA.GAIN_PER_HIT);
    }
  }

  private handleSkillInput(): void {
    if (this.inputManager.justDown('SKILL_1')) this.castSkill('skill1');
    else if (this.inputManager.justDown('SKILL_2')) this.castSkill('skill2');
    else if (this.inputManager.justDown('SKILL_3')) this.castSkill('skill3');
    else if (this.inputManager.justDown('ULTIMATE')) this.castSkill('ultimate');
    else if (this.inputManager.justDown('TRANSFORM')) this.castSkill('transform');
  }

  private castSkill(slot: SkillSlot): void {
    if (!this.gameSettings.zeroCooldown && this.cooldowns[slot] > 0) return;
    if (slot === 'transform') {
      this.isTransformed = !this.isTransformed;
      this.animController.setVariant(this.isTransformed ? 'spirit' : 'base');
      this.transformMs = this.isTransformed ? 12000 : 0;
      this.cooldowns[slot] = this.gameSettings.zeroCooldown ? 0 : COOLDOWN_MS.TRANSFORM;
      if (this.isTransformed) {
        this.host.setPlayerAura(true, this.definition.auraColorHex);
        this.host.notifyPlayer('SPIRIT MODE — พลังเพิ่มขึ้น!', '#ffd166');
        this.host.createHitBurst(this.x, this.y - 55, this.definition.auraColorHex, true);
      } else {
        this.host.setPlayerAura(false, this.definition.auraColorHex);
      }
      return;
    }
    const costs: Record<Exclude<SkillSlot, 'transform'>, number> = { skill1: 18, skill2: 28, skill3: 40, ultimate: 65 };
    const cost = costs[slot];
    if (this.chakra < cost) { this.host.notifyPlayer('จักระไม่พอ', '#ff8fab'); return; }
    if (!this.gameSettings.infiniteChakra) this.chakra -= cost;
    const cooldowns: Record<Exclude<SkillSlot, 'transform'>, number> = { skill1: COOLDOWN_MS.SKILL_1, skill2: COOLDOWN_MS.SKILL_2, skill3: COOLDOWN_MS.SKILL_3, ultimate: COOLDOWN_MS.ULTIMATE };
    this.cooldowns[slot] = this.gameSettings.zeroCooldown ? 0 : cooldowns[slot];
    this.actionLockMs = slot === 'ultimate' ? 640 : 360;
    if (this.y >= this.groundY - 4) {
      this.setY(this.groundY);
      this.setVelocityY(0);
      (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    }
    this.setVelocityX(0);
    this.stateMachine.transition('skill');
    this.host.handlePlayerSkill(slot, this.x, this.y - 55, this.facing);
  }

  private startDash(direction: 1 | -1): void {
    this.dashDirection = direction;
    this.facing = direction > 0 ? 'right' : 'left';
    this.setFlipX(direction < 0);
    this.stateMachine.transition('dash');
  }

  private updateDash(delta: number): void {
    this.setVelocity(this.dashDirection * PHYSICS.DASH_SPEED, 0);
    this.dashTimeRemainingMs -= delta;
    if (this.dashTimeRemainingMs <= 0) {
      this.isDashing = false;
      this.stateMachine.transition('idle');
    }
  }

  private updateMotionState(onGround: boolean): void {
    if (this.charging || this.isDashing || this.actionLockMs > 0 || this.hp <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!onGround) this.stateMachine.transition(body.velocity.y < 0 ? 'jump' : 'fall');
    else if (Math.abs(body.velocity.x) > 20) this.stateMachine.transition('run');
    else this.stateMachine.transition('idle');
  }

  private updateCharging(delta: number): void {
    if (!this.charging) {
      this.charging = true;
      this.stateMachine.transition('charge');
      this.host.setPlayerCharging(true, this.isTransformed ? this.definition.auraColorHex : 0x64e6db);
      this.host.notifyPlayer('CHAKRA CHARGE', '#64e6db');
    }
    if (!this.gameSettings.infiniteChakra) {
      this.chakra = Math.min(this.maxChakra, this.chakra + CHAKRA.CHARGE_PER_SEC * delta / 1000);
    }
    if (this.scene.time.now >= this.nextChargePulseAt) {
      this.host.createHitBurst(this.x, this.y - 45, this.isTransformed ? this.definition.auraColorHex : 0x64e6db);
      this.nextChargePulseAt = this.scene.time.now + 330;
    }
  }

  private stopCharging(): void {
    if (!this.charging) return;
    this.charging = false;
    this.host.setPlayerCharging(false, 0x64e6db);
    if (this.hp > 0) this.stateMachine.transition('idle');
  }
}

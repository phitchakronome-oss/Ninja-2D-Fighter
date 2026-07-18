import Phaser from 'phaser';
import { ANIMATION } from '../config/GameConfig';
import type { AnimState, CharacterId } from '../core/types';
import { CHARACTER_ANIMATION_SHEETS } from '../data/animations';

export interface PlayOptions {
  /** ทิศที่ตัวละครหันหน้าอยู่ ณ ตอนเล่นท่านี้ (ใช้กับ run/dash/attack ตอน fallback) */
  facing?: 'left' | 'right';
  /** เล่นท่าเดิมซ้ำแม้ state จะไม่เปลี่ยน (ปกติ play() จะข้ามถ้า state เดิม) */
  force?: boolean;
}

/**
 * AnimationController
 * ตัวกลางเดียวที่ Character/Enemy/Boss เรียกใช้เพื่อ "เล่นท่าทาง" ตาม state ปัจจุบัน
 * โดยไม่ต้องสนใจว่าตอนนี้มี sprite sheet จริงหรือยัง
 *
 * โหมดที่ 1 — Sprite Sheet จริง:
 *   ถ้ามี entry ของตัวละครนี้ใน CHARACTER_ANIMATION_SHEETS (src/data/animations.ts)
 *   และ texture ถูกโหลดเข้ามาแล้ว controller จะสร้าง Phaser animation (key รูปแบบ
 *   `${characterId}_${state}`) แล้วสั่ง sprite.play(key) ให้ตามปกติ
 *
 * โหมดที่ 2 — Placeholder Fallback (ใช้อยู่ตอนนี้ เพราะยังไม่มี asset):
 *   สร้าง "การเคลื่อนไหวปลอม" ด้วย Tween ล้วน ๆ (บีบยืด, เอียงตัว, สั่น, โกสต์เทรลตอน dash)
 *   เพื่อให้เกมยังรู้สึกมีชีวิตระหว่างรอ art จริง
 *
 * การสลับโหมดเกิดขึ้นอัตโนมัติทีละตัวละคร — ไม่ต้องแก้ไฟล์นี้หรือ Character.ts เลย
 * แค่เติมข้อมูลใน animations.ts แล้วโหลด sprite sheet ใน PreloadScene ก็พอ
 */
export class AnimationController {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly characterId: CharacterId;

  private currentState: AnimState | null = null;
  private variant: 'base' | 'spirit' = 'base';
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;
  private readonly baseDisplayHeight: number;
  private readonly defaultTextureKey: string;
  private readonly defaultFrame: string | number;
  private ghostTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, sprite: Phaser.Physics.Arcade.Sprite, characterId: CharacterId) {
    this.scene = scene;
    this.sprite = sprite;
    this.characterId = characterId;
    this.baseScaleX = sprite.scaleX;
    this.baseScaleY = sprite.scaleY;
    this.baseDisplayHeight = sprite.displayHeight;
    this.defaultTextureKey = sprite.texture.key;
    this.defaultFrame = sprite.frame.name;
  }

  /**
   * เรียกครั้งเดียวใน PreloadScene หลังโหลด asset เสร็จ
   * สร้าง Phaser animation จากข้อมูลใน animations.ts ให้ทุกตัวละครที่มี texture พร้อมแล้ว
   * ตัวละครที่ยังไม่มี texture จะถูกข้ามไปเงียบ ๆ (ยังใช้ placeholder fallback ต่อ)
   */
  static registerAllFromData(scene: Phaser.Scene): void {
    Object.values(CHARACTER_ANIMATION_SHEETS).forEach((sheet) => {
      if (!sheet) return;
      if (!scene.textures.exists(sheet.textureKey)) return;

      (Object.entries(sheet.clips) as [AnimState, { frameStart: number; frameEnd: number; frameRate: number; repeat: number }][]).forEach(
        ([state, clip]) => {
          const key = `${sheet.characterId}_${state}`;
          if (scene.anims.exists(key)) return;
          scene.anims.create({
            key,
            frames: scene.anims.generateFrameNumbers(sheet.textureKey, {
              start: clip.frameStart,
              end: clip.frameEnd,
            }),
            frameRate: clip.frameRate,
            repeat: clip.repeat,
          });
        },
      );
    });
  }

  setVariant(variant: 'base' | 'spirit'): void {
    if (this.variant === variant) return;
    this.variant = variant;
    const state = this.currentState ?? 'idle';
    this.currentState = null;
    this.play(state, { facing: this.sprite.flipX ? 'left' : 'right', force: true });
  }

  /** เล่นท่าทางตาม state — ใช้ sprite sheet จริงถ้ามี ไม่งั้น fallback เป็น tween */
  play(state: AnimState, opts: PlayOptions = {}): void {
    if (this.currentState === state && !opts.force) return;
    this.currentState = state;

    const realKey = this.getAnimationKey(state);
    if (this.scene.anims.exists(realKey)) {
      this.stopGhostTrail();
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setAngle(0).setAlpha(1);
      // Runtime sheets are normalized so row 250 is the visual foot line.
      // Using that exact pivot prevents transparent padding from lifting the hero.
      this.sprite.setOrigin(0.5, 250 / 256);
      this.sprite.play(realKey, true);
      this.fitCurrentFrameToBaseHeight();
      if (state === 'dead') {
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          angle: this.sprite.flipX ? -ANIMATION.DEATH_ROTATE_DEG : ANIMATION.DEATH_ROTATE_DEG,
          duration: ANIMATION.DEATH_FADE_MS,
          ease: 'Quad.easeIn',
        });
      }
      return;
    }

    this.playFallback(state, opts);
  }

  private playFallback(state: AnimState, opts: PlayOptions): void {
    const tweens = this.scene.tweens;
    const spiritTexture = this.characterId === 'kaito' && this.variant === 'spirit' && this.scene.textures.exists('char_kaito_spirit_sheet');
    const targetTexture = spiritTexture ? 'char_kaito_spirit_sheet' : this.defaultTextureKey;
    const targetFrame = spiritTexture ? 19 : this.defaultFrame;
    if (this.sprite.texture.key !== targetTexture || this.sprite.frame.name !== targetFrame) {
      this.sprite.stop();
      this.sprite.setTexture(targetTexture, targetFrame);
      this.sprite.setOrigin(0.5, spiritTexture ? 250 / 256 : 1);
      this.fitCurrentFrameToBaseHeight();
    }
    const isDashing = state === 'dash';
    if (!isDashing) this.stopGhostTrail();

    switch (state) {
      case 'idle':
        tweens.killTweensOf(this.sprite);
        this.sprite.setScale(this.baseScaleX, this.baseScaleY);
        this.sprite.setAngle(0);
        tweens.add({
          targets: this.sprite,
          scaleY: this.baseScaleY * ANIMATION.IDLE_BOB_SCALE,
          duration: ANIMATION.IDLE_BOB_DURATION_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'run': {
        tweens.killTweensOf(this.sprite);
        const lean = opts.facing === 'left' ? ANIMATION.RUN_LEAN_DEG : -ANIMATION.RUN_LEAN_DEG;
        this.sprite.setAngle(lean);
        this.sprite.setScale(this.baseScaleX, this.baseScaleY);
        tweens.add({
          targets: this.sprite,
          scaleY: this.baseScaleY * ANIMATION.RUN_BOB_SCALE,
          duration: ANIMATION.RUN_BOB_DURATION_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      }

      case 'jump':
        tweens.killTweensOf(this.sprite);
        this.sprite.setAngle(0);
        this.sprite.setScale(this.baseScaleX, this.baseScaleY);
        tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * ANIMATION.JUMP_SQUASH_SCALE_X,
          scaleY: this.baseScaleY * ANIMATION.JUMP_SQUASH_SCALE_Y,
          duration: ANIMATION.JUMP_SQUASH_MS,
          ease: 'Quad.easeOut',
        });
        break;

      case 'fall':
        tweens.killTweensOf(this.sprite);
        tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * ANIMATION.FALL_STRETCH_SCALE_X,
          scaleY: this.baseScaleY * ANIMATION.FALL_STRETCH_SCALE_Y,
          angle: 0,
          duration: ANIMATION.JUMP_SQUASH_MS,
          ease: 'Sine.easeIn',
        });
        break;

      case 'dash':
        tweens.killTweensOf(this.sprite);
        this.sprite.setAngle(0);
        this.sprite.setScale(this.baseScaleX * 1.1, this.baseScaleY * 0.9);
        this.startGhostTrail(opts.facing ?? 'right');
        break;

      case 'charge':
        tweens.killTweensOf(this.sprite);
        this.sprite.setAngle(0).setScale(this.baseScaleX, this.baseScaleY);
        tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * 1.035,
          scaleY: this.baseScaleY * 0.975,
          duration: 180,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'skill':
        tweens.killTweensOf(this.sprite);
        this.sprite.setAngle(0).setScale(this.baseScaleX, this.baseScaleY);
        tweens.add({ targets: this.sprite, scaleX: this.baseScaleX * 1.08, scaleY: this.baseScaleY * 0.94, duration: 120, yoyo: true });
        break;

      case 'attack1':
      case 'attack2':
      case 'attack3': {
        tweens.killTweensOf(this.sprite);
        this.sprite.setScale(this.baseScaleX, this.baseScaleY);
        const strength = state === 'attack3' ? 14 : state === 'attack2' ? 10 : 7;
        const direction = opts.facing === 'left' ? -1 : 1;
        this.sprite.setAngle(-strength * direction * 0.45);
        tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * ANIMATION.ATTACK_PUNCH_SCALE,
          scaleY: this.baseScaleY * (2 - ANIMATION.ATTACK_PUNCH_SCALE),
          angle: strength * direction,
          duration: state === 'attack3' ? ANIMATION.ATTACK_PUNCH_MS * 1.45 : ANIMATION.ATTACK_PUNCH_MS,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => this.sprite.setAngle(0),
        });
        break;
      }

      case 'hurt':
        tweens.killTweensOf(this.sprite);
        this.sprite.setTint(0xff3b3b);
        this.scene.time.delayedCall(ANIMATION.HURT_FLASH_MS, () => this.sprite.clearTint());
        tweens.add({
          targets: this.sprite,
          angle: opts.facing === 'left' ? -ANIMATION.HURT_SHAKE_PX : ANIMATION.HURT_SHAKE_PX,
          duration: ANIMATION.HURT_SHAKE_MS / 6,
          yoyo: true,
          repeat: 5,
          ease: 'Sine.easeInOut',
          onComplete: () => this.sprite.setAngle(0),
        });
        break;

      case 'dead':
        tweens.killTweensOf(this.sprite);
        tweens.add({
          targets: this.sprite,
          alpha: 0,
          angle: ANIMATION.DEATH_ROTATE_DEG,
          duration: ANIMATION.DEATH_FADE_MS,
          ease: 'Quad.easeIn',
        });
        break;
    }
  }

  /** เรียกตอนตัวละครลงพื้นพอดี (jump/fall -> idle/run) เพื่อเพิ่มฟีลลิ่งกระแทกพื้น */
  playLandingSquash(): void {
    if (this.currentState && this.scene.anims.exists(this.getAnimationKey(this.currentState))) return; // มี sprite sheet จริงแล้ว ไม่ต้องใช้ fallback squash

    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(
      this.baseScaleX * ANIMATION.LAND_SQUASH_SCALE_X,
      this.baseScaleY * ANIMATION.LAND_SQUASH_SCALE_Y,
    );
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScaleX,
      scaleY: this.baseScaleY,
      duration: ANIMATION.LAND_RECOVER_MS,
      ease: 'Elastic.easeOut',
    });
  }

  private startGhostTrail(facing: 'left' | 'right'): void {
    this.stopGhostTrail();
    let spawned = 0;
    this.ghostTimer = this.scene.time.addEvent({
      delay: ANIMATION.DASH_GHOST_SPAWN_INTERVAL_MS,
      repeat: ANIMATION.DASH_GHOST_COUNT - 1,
      callback: () => {
        spawned += 1;
        this.spawnGhost(facing);
        if (spawned >= ANIMATION.DASH_GHOST_COUNT) this.stopGhostTrail();
      },
    });
  }

  private spawnGhost(_facing: 'left' | 'right'): void {
    const ghost = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name);
    ghost.setFlipX(this.sprite.flipX);
    ghost.setScale(this.sprite.scaleX, this.sprite.scaleY);
    ghost.setAlpha(0.45);
    ghost.setTint(0x99ccff);
    ghost.setDepth((this.sprite.depth ?? 0) - 1);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: ANIMATION.DASH_GHOST_FADE_MS,
      ease: 'Sine.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  private stopGhostTrail(): void {
    this.ghostTimer?.remove();
    this.ghostTimer = undefined;
  }

  private fitCurrentFrameToBaseHeight(): void {
    const frameWidth = this.sprite.frame.realWidth || this.sprite.width;
    const frameHeight = this.sprite.frame.realHeight || this.sprite.height;
    this.sprite.setDisplaySize(this.baseDisplayHeight * frameWidth / frameHeight, this.baseDisplayHeight);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      // Body dimensions are texture-relative in Arcade Physics. Re-syncing here
      // keeps the collision feet fixed when switching 768x512 art to 256x256 frames.
      const bodyWidth = 34 / Math.max(0.001, Math.abs(this.sprite.scaleX));
      const bodyHeight = 96 / Math.max(0.001, Math.abs(this.sprite.scaleY));
      body.setSize(bodyWidth, bodyHeight);
      body.setOffset(
        frameWidth * 0.5 - bodyWidth * 0.5,
        frameHeight * this.sprite.originY - bodyHeight,
      );
      body.updateFromGameObject();
    }
  }

  private getAnimationKey(state: AnimState): string {
    return `${this.characterId}_${this.variant === 'spirit' ? 'spirit_' : ''}${state}`;
  }
}

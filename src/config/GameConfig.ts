/**
 * GameConfig.ts
 * ค่าคงที่หลักของเกมทั้งหมด — ปรับจูนสมดุลเกมจากไฟล์เดียวได้ที่นี่
 */

export const SCREEN = {
  WIDTH: 1280,
  HEIGHT: 720,
} as const;

export const PHYSICS = {
  GRAVITY_Y: 1400,
  WALK_SPEED: 220,
  RUN_SPEED: 380,
  DASH_SPEED: 700,
  DASH_DURATION_MS: 180,
  JUMP_VELOCITY: -620,
  DOUBLE_JUMP_VELOCITY: -560,
} as const;

export const COMBAT = {
  HIT_STOP_MS: 60, // เฟรมหยุดนิ่งตอนโดนตี (juice)
  INVINCIBLE_AFTER_HIT_MS: 500,
  CRITICAL_CHANCE_BASE: 0.08,
  CRITICAL_MULTIPLIER: 1.75,
  COMBO_RESET_TIME_MS: 900, // ถ้าไม่โจมตีต่อภายในเวลานี้ คอมโบจะรีเซ็ต
  KNOCKBACK_FORCE: 260,
} as const;

export const CHAKRA = {
  MAX_BASE: 100,
  REGEN_PER_SEC: 2.5,
  GAIN_PER_HIT: 4,
  GAIN_PER_KILL: 10,
} as const;

export const COOLDOWN_MS = {
  SKILL_1: 5_000,
  SKILL_2: 8_000,
  SKILL_3: 15_000,
  ULTIMATE: 30_000,
  TRANSFORM: 45_000,
} as const;

export const EXP = {
  BASE_TO_LEVEL_UP: 100,
  GROWTH_RATE: 1.18, // exp ที่ต้องใช้ต่อเลเวลเพิ่มขึ้น 18% ทบต้น
  STAT_GAIN_PER_LEVEL: {
    hp: 12,
    chakra: 6,
    damage: 2,
    defense: 1.5,
  },
} as const;

export const INPUT_KEYS = {
  LEFT: ['LEFT', 'A'],
  RIGHT: ['RIGHT', 'D'],
  JUMP: ['UP', 'W'], // เดิน+กระโดดใช้ WASD ทั้งหมด (ลูกศรใช้ได้เหมือนกันเป็นทางเลือกสำรอง)
  DOWN: ['DOWN', 'S'],
  ATTACK: 'J',
  SKILL_1: 'U',
  SKILL_2: 'I',
  SKILL_3: 'O',
  ULTIMATE: 'K',
  TRANSFORM: 'L',
} as const;

/** ดับเบิลแท็ป A หรือ D ภายในเวลานี้ (ms) เพื่อ Dash — แทนการใช้ปุ่ม Shift แยก */
export const DASH_DOUBLE_TAP_WINDOW_MS = 260;

export const DEBUG = {
  SHOW_HITBOXES: false, // ⚡ แก้ไขจุดนี้: เปลี่ยนจาก true เป็น false เพื่อนำเส้นกรอบรอบตัวนินจาออก!
  SHOW_FPS: true,
} as const;

/**
 * ANIMATION
 * ค่าที่ใช้โดย AnimationController (src/systems/AnimationController.ts)
 * ตอนนี้ยังไม่มี sprite sheet จริง ค่าพวกนี้เลยถูกใช้ทำ "placeholder juice"
 * (บีบยืด/เอียงตัว/สั่น/โกสต์เทรล) แทน frame animation จริงไปก่อน
 * พอใส่ sprite sheet จริงแล้ว ค่ากลุ่มนี้จะไม่ถูกใช้อีกต่อไปโดยอัตโนมัติ
 */
export const ANIMATION = {
  IDLE_BOB_SCALE: 1.04,
  IDLE_BOB_DURATION_MS: 900,
  RUN_LEAN_DEG: 5,
  RUN_BOB_SCALE: 1.06,
  RUN_BOB_DURATION_MS: 180,
  JUMP_SQUASH_SCALE_X: 0.88,
  JUMP_SQUASH_SCALE_Y: 1.18,
  JUMP_SQUASH_MS: 120,
  FALL_STRETCH_SCALE_X: 0.92,
  FALL_STRETCH_SCALE_Y: 1.1,
  LAND_SQUASH_SCALE_X: 1.2,
  LAND_SQUASH_SCALE_Y: 0.78,
  LAND_RECOVER_MS: 160,
  DASH_GHOST_COUNT: 4,
  DASH_GHOST_SPAWN_INTERVAL_MS: 32,
  DASH_GHOST_FADE_MS: 220,
  HURT_FLASH_MS: 100,
  HURT_SHAKE_PX: 5,
  HURT_SHAKE_MS: 220,
  ATTACK_PUNCH_SCALE: 1.15,
  ATTACK_PUNCH_MS: 90,
  DEATH_FADE_MS: 600,
  DEATH_ROTATE_DEG: 80,
} as const;

/**
 * types.ts
 * Interface กลางที่ระบบต่าง ๆ ใช้ร่วมกัน
 * การเพิ่มตัวละคร/สกิล/ศัตรูใหม่ ต้อง implement interface เหล่านี้
 */

export type Direction = 'left' | 'right';

export type CharacterId =
  | 'kaito'
  | 'ren'
  | 'toru'
  | 'kuro'
  | 'raiden'
  | 'kagerou';

export type SkillSlot = 'skill1' | 'skill2' | 'skill3' | 'ultimate' | 'transform';

/** สถานะที่ AnimationController รู้จัก — ผูกกับ StateMachine ของ Character/Enemy/Boss */
export type AnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'dash'
  | 'charge'
  | 'skill'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'hurt'
  | 'dead';

/** ช่วง frame ของแต่ละท่าใน sprite sheet — เติมตัวเลขจริงตอนมี asset (ดู src/data/animations.ts) */
export interface AnimationClipConfig {
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  repeat: number; // -1 = วนลูป, 0 = เล่นครั้งเดียว
}

export type CharacterAnimationClips = Partial<Record<AnimState, AnimationClipConfig>>;

/** ข้อมูล sprite sheet ของตัวละครหนึ่งตัว (data-driven เหมือน CharacterDefinition) */
export interface CharacterAnimationSheet {
  characterId: CharacterId;
  textureKey: string; // key ที่ตั้งตอน this.load.spritesheet(textureKey, ...)
  frameWidth: number;
  frameHeight: number;
  clips: CharacterAnimationClips;
}

export interface StatBlock {
  maxHp: number;
  maxChakra: number;
  damage: number;
  defense: number;
  speedMultiplier: number;
}

/** ข้อมูลตั้งต้นของตัวละครแต่ละตัว (data-driven, ไม่ผูกกับ logic) */
export interface CharacterDefinition {
  id: CharacterId;
  displayName: string;
  title: string; // เช่น "จอมเวทธาตุลม"
  baseStats: StatBlock;
  spriteKey: string;
  portraitKey: string;
  skillIds: Record<SkillSlot, string>;
  auraColorHex: number; // สีออร่าตอน Transform
}

/** ผลลัพธ์ของการใช้สกิล ส่งกลับไปให้ CombatSystem จัดการ */
export interface SkillContext {
  caster: unknown; // จะกำหนดชนิดจริงเป็น Character หลัง Step 4
  facing: Direction;
}

export interface SkillDefinition {
  id: string;
  slot: SkillSlot;
  name: string;
  description: string;
  chakraCost: number;
  cooldownMs: number;
  animationKey: string;
  soundKey: string;
  vfxKey: string;
  execute: (ctx: SkillContext) => void;
}

export type EnemyBehaviorType =
  | 'melee_walker'
  | 'fast_runner'
  | 'ranged_shooter'
  | 'skill_caster'
  | 'tank'
  | 'mini_boss';

export interface EnemyDefinition {
  id: string;
  displayName: string;
  behavior: EnemyBehaviorType;
  stats: StatBlock;
  expReward: number;
  goldDropRange: [number, number];
  spriteKey: string;
}

export interface BossPhaseDefinition {
  hpThreshold: number; // 0.5 = เปลี่ยนเฟสตอนเลือดต่ำกว่า 50%
  moveSetIds: string[];
  speedMultiplier: number;
}

export interface BossDefinition {
  id: string;
  displayName: string;
  stats: StatBlock;
  phases: BossPhaseDefinition[];
  spriteKey: string;
}

export interface StageDefinition {
  id: string;
  displayName: string;
  tilemapKey: string;
  backgroundMusicKey: string;
  enemySpawnTable: { enemyId: string; count: number }[];
  bossId: string;
}

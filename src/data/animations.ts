import type { CharacterAnimationSheet, CharacterId } from '../core/types';

/** Frame layout for the supplied 960x2048 sheet (10 columns x 32 rows). */
const clips = {
  idle: { frameStart: 0, frameEnd: 0, frameRate: 1, repeat: -1 },
  run: { frameStart: 1, frameEnd: 3, frameRate: 10, repeat: -1 },
  jump: { frameStart: 4, frameEnd: 4, frameRate: 1, repeat: 0 },
  fall: { frameStart: 5, frameEnd: 5, frameRate: 1, repeat: 0 },
  dash: { frameStart: 6, frameEnd: 9, frameRate: 16, repeat: 0 },
  attack1: { frameStart: 80, frameEnd: 82, frameRate: 14, repeat: 0 },
  attack2: { frameStart: 83, frameEnd: 85, frameRate: 14, repeat: 0 },
  attack3: { frameStart: 86, frameEnd: 89, frameRate: 16, repeat: 0 },
  hurt: { frameStart: 20, frameEnd: 21, frameRate: 10, repeat: 0 },
  dead: { frameStart: 28, frameEnd: 29, frameRate: 5, repeat: 0 },
};

export const CHARACTER_ANIMATION_SHEETS: Partial<Record<CharacterId, CharacterAnimationSheet>> = {
  kaito: {
    characterId: 'kaito',
    textureKey: 'char_kaito_sheet',
    frameWidth: 96,
    frameHeight: 64,
    clips,
  },
  ren: {
    characterId: 'ren',
    textureKey: 'char_ren_sheet',
    frameWidth: 96,
    frameHeight: 64,
    clips,
  },
};

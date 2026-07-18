import type { CharacterAnimationSheet, CharacterId } from '../core/types';

export const CHARACTER_ANIMATION_SHEETS: Partial<Record<CharacterId, CharacterAnimationSheet>> = {
  kaito: {
    characterId: 'kaito',
    textureKey: 'char_kaito_sheet',
    frameWidth: 256,
    frameHeight: 256,
    clips: {
      idle: { frameStart: 19, frameEnd: 19, frameRate: 1, repeat: -1 },
      run: { frameStart: 0, frameEnd: 11, frameRate: 20, repeat: -1 },
      jump: { frameStart: 3, frameEnd: 3, frameRate: 1, repeat: 0 },
      fall: { frameStart: 11, frameEnd: 11, frameRate: 1, repeat: 0 },
      dash: { frameStart: 0, frameEnd: 7, frameRate: 36, repeat: 0 },
      charge: { frameStart: 19, frameEnd: 19, frameRate: 1, repeat: -1 },
      skill: { frameStart: 12, frameEnd: 19, frameRate: 24, repeat: 0 },
      attack1: { frameStart: 12, frameEnd: 19, frameRate: 24, repeat: 0 },
      attack3: { frameStart: 12, frameEnd: 19, frameRate: 21, repeat: 0 },
      hurt: { frameStart: 18, frameEnd: 18, frameRate: 1, repeat: 0 },
      dead: { frameStart: 19, frameEnd: 19, frameRate: 1, repeat: 0 },
    },
  },
};

import type { CharacterAnimationSheet, CharacterId } from '../core/types';

export const CHARACTER_ANIMATION_SHEETS: Partial<Record<CharacterId, CharacterAnimationSheet>> = {
  kaito: {
    characterId: 'kaito',
    textureKey: 'char_kaito_sheet',
    frameWidth: 256,
    frameHeight: 256,
    clips: {
      run: { frameStart: 0, frameEnd: 11, frameRate: 16, repeat: -1 },
      attack1: { frameStart: 12, frameEnd: 19, frameRate: 24, repeat: 0 },
    },
  },
};

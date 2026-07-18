import type { CharacterDefinition } from '../core/types';

export const CHARACTER_ROSTER: CharacterDefinition[] = [
  {
    id: 'kaito',
    displayName: 'Kaito Uzuma',
    title: 'จอมเวทธาตุลม',
    baseStats: { maxHp: 120, maxChakra: 100, damage: 12, defense: 8, speedMultiplier: 1.0 },
    spriteKey: 'hero_kaito',
    portraitKey: 'portrait_kaito',
    skillIds: {
      skill1: 'kaito_wind_orb',
      skill2: 'kaito_shadow_allies',
      skill3: 'kaito_storm_fist',
      ultimate: 'kaito_giant_wind_orb',
      transform: 'kaito_spirit_mode',
    },
    auraColorHex: 0xffd54a,
  }
];

export function getCharacterDefinition(id: string): CharacterDefinition | undefined {
  return CHARACTER_ROSTER.find((c) => c.id === id);
}

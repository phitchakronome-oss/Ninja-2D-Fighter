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
  },
  {
    id: 'ren',
    displayName: 'Ren Kurogami',
    title: 'สายเลือดต้องคำสาป',
    baseStats: { maxHp: 105, maxChakra: 110, damage: 14, defense: 6, speedMultiplier: 1.05 },
    spriteKey: 'hero_ren',
    portraitKey: 'portrait_ren',
    skillIds: {
      skill1: 'ren_binding_serpents',
      skill2: 'ren_black_dragon_flame',
      skill3: 'ren_eye_of_ruin',
      ultimate: 'ren_demon_sword_storm',
      transform: 'ren_soul_armor',
    },
    auraColorHex: 0x8a2be2,
  }
  // สมาชิกตัวอื่นๆ ปรับเปลี่ยนค่า spriteKey ให้มีคำว่า _sheet ต่อท้ายตามต้องการได้เลยครับ
];

export function getCharacterDefinition(id: string): CharacterDefinition | undefined {
  return CHARACTER_ROSTER.find((c) => c.id === id);
}

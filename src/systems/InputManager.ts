import Phaser from 'phaser';
import { INPUT_KEYS } from '../config/GameConfig';

type ActionName = keyof typeof INPUT_KEYS;

/**
 * InputManager
 * แปลง key binding จาก GameConfig เป็น Phaser Key object
 * ระบบอื่นเรียกใช้ผ่านชื่อ action (เช่น 'JUMP', 'DASH') แทนการผูก keycode ตรง ๆ
 * → เปลี่ยนปุ่มควบคุมทั้งเกมได้จากไฟล์ GameConfig.ts ไฟล์เดียว
 */
export class InputManager {
  private boundKeys: Partial<Record<ActionName, Phaser.Input.Keyboard.Key[]>> = {};

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      console.warn('[InputManager] Keyboard plugin ไม่พร้อมใช้งานในฉากนี้');
      return;
    }

    (Object.keys(INPUT_KEYS) as ActionName[]).forEach((action) => {
      const binding: string | readonly string[] = INPUT_KEYS[action];
      const keyNames: string[] = Array.isArray(binding) ? [...binding] : [binding as string];
      const keys: Phaser.Input.Keyboard.Key[] = [];
      for (const name of keyNames) {
        const keyCode = Phaser.Input.Keyboard.KeyCodes[name as keyof typeof Phaser.Input.Keyboard.KeyCodes];
        keys.push(keyboard.addKey(keyCode));
      }
      this.boundKeys[action] = keys;
    });
  }

  /** true ตราบเท่าที่ปุ่มยังถูกกดค้างอยู่ */
  isDown(action: ActionName): boolean {
    return (this.boundKeys[action] ?? []).some((key) => key.isDown);
  }

  /** true แค่เฟรมเดียวตอนกดปุ่มลงครั้งแรก (ใช้กับ Jump/Dash/Skill) */
  justDown(action: ActionName): boolean {
    return (this.boundKeys[action] ?? []).some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}

import Phaser from 'phaser';

/**
 * BootScene
 * ทำงานแรกสุด — ตั้งค่าระบบพื้นฐาน (เช่น scale, physics debug) ก่อนเข้าสู่ PreloadScene
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // โหลดเฉพาะ asset เล็ก ๆ ที่ต้องใช้แสดง Loading bar (โลโก้, background หน้าโหลด)
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}

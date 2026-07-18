# Shadow Chronicles — 2D Action RPG

เกม Action RPG 2D แนว Side-scrolling Beat'em up / Boss Rush
สร้างด้วย **Phaser 4 + TypeScript + Vite**

## ปุ่มควบคุม

| ปุ่ม | การกระทำ |
|---|---|
| `A / D` หรือ `← / →` | เดิน (แตะทิศทางซ้ำเพื่อ Dash) |
| `W` หรือ `↑` | กระโดด / Double Jump |
| `J` | คอมโบโจมตี 3 จังหวะ |
| `U / I / O` | สกิล 1–3 |
| `K` | Ultimate |
| `L` | โหมดจักระ |
| `R` | เริ่มด่านใหม่ |

## เริ่มต้นใช้งาน (VS Code)

1. เปิดโฟลเดอร์นี้ใน VS Code
2. เปิด terminal ใน VS Code แล้วรัน:
   ```bash
   npm install
   npm run dev
   ```
3. เปิดเบราว์เซอร์ตาม URL ที่ Vite แสดง (ปกติคือ `http://localhost:5173`)
4. แก้โค้ดแล้ว save → เกม hot-reload อัตโนมัติ

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันเกมโหมดพัฒนา (hot reload) |
| `npm run build` | Build เป็นไฟล์ production ใน `dist/` |
| `npm run preview` | รันไฟล์ production ที่ build แล้วเพื่อทดสอบ |
| `npx tsc --noEmit` | ตรวจสอบ TypeScript type errors ทั้งโปรเจกต์ |

## โครงสร้างโปรเจกต์

```
src/
├── config/         ค่าคงที่เกมทั้งหมด (ปรับสมดุลเกมที่นี่)
├── core/           Interface/Type กลางที่ทุกระบบใช้ร่วมกัน
├── data/           ข้อมูลตัวละคร/สกิล/ศัตรู/ด่าน (data-driven)
├── entities/       Class ตัวละคร/ศัตรู/บอส
│   ├── characters/
│   ├── enemies/
│   └── bosses/
├── skills/         Logic การทำงานของแต่ละสกิล แยกไฟล์ตามตัวละคร
├── scenes/         ฉากต่าง ๆ ของเกม (Boot, Preload, CharacterSelect, Stage, UI)
├── systems/         ระบบกลาง (Combat, Chakra, EXP, Save ฯลฯ) — จะเพิ่มใน Step ถัดไป
├── ui/             Component UI/HUD
└── utils/          Helper function ทั่วไป

public/assets/
├── sprites/        Sprite sheet ตัวละคร/ศัตรู/effect
├── audio/          เพลง/เสียงประกอบ
└── effects/        Particle texture
```

ภาพตัวละครและศัตรูเวอร์ชันเต็มถูกเก็บใน `art_sources/generated/` ส่วนไฟล์ที่ปรับขนาดและลดน้ำหนักสำหรับเกมอยู่ใน `public/assets/sprites/` ดู prompt ที่ใช้และ prompt สำหรับสร้าง sprite sheet ต่อได้ใน `docs/ASSET_GENERATION_PROMPTS.md`.

## ระบบ Animation

`src/systems/AnimationController.ts` เป็นตัวกลางเดียวที่ `Character` เรียกใช้เพื่อเล่นท่าทางตาม state
(idle/run/jump/fall/dash/attack1-3/hurt/dead) โดยทำงาน 2 โหมดสลับกันอัตโนมัติ **ต่อตัวละคร**:

1. **มี sprite sheet จริงแล้ว** — ถ้าเติมข้อมูล frame ใน `src/data/animations.ts` และโหลด
   spritesheet ของตัวละครนั้นใน `PreloadScene.ts` แล้ว ระบบจะสร้าง Phaser animation
   (`scene.anims.create`) และเล่นแบบ frame animation ปกติ
2. **ยังไม่มี sprite sheet (สถานะปัจจุบันของทุกตัวละคร)** — ระบบจะ fallback เป็น "placeholder juice"
   ที่สร้างด้วย Tween ล้วน ๆ: idle หายใจเบา ๆ, run เอียงตัว+เด้ง, jump/fall บีบยืดตามฟิสิกส์,
   ลงพื้นมี squash, dash มีโกสต์เทรลสีฟ้าให้ความรู้สึกเร็ว, hurt กระพริบแดง+สั่น, dead จางหายพร้อมหมุนล้ม

**วิธีเปิดใช้ animation จริงของตัวละครตัวหนึ่ง** ดูขั้นตอนละเอียดเป็นคอมเมนต์ใน
`src/data/animations.ts` — สรุปสั้น ๆ คือ: โหลด spritesheet ใน PreloadScene → เติม frame
range ใน `CHARACTER_ANIMATION_SHEETS` → ไม่ต้องแก้ `Character.ts` หรือ scene ใดเลย

## วิธีเพิ่มตัวละครใหม่

1. เพิ่ม entry ใหม่ใน `src/data/characters.ts`
2. สร้างไฟล์สกิลใน `src/skills/<characterId>/`
3. เตรียม sprite/portrait asset ให้ตรงกับ key ที่ระบุใน data
4. **ไม่ต้องแก้ scene หรือ system อื่นเลย** — ระบบเป็น data-driven ทั้งหมด

## สถานะระบบเกม

- [x] Step 1-2: Tech Stack + โครงสร้างโปรเจกต์
- [x] Step 3: ติดตั้ง Package เพิ่มเติมที่จำเป็น (ไม่ต้องเพิ่ม — ใช้ Phaser built-in Tween/Animation ทั้งหมด)
- [x] Step 4: ระบบ Player (เดิน/วิ่ง/Dash/กระโดด/Double Jump)
- [x] Step 5: ระบบ Animation (`AnimationController` — โหมด sprite sheet จริง + โหมด placeholder juice อัตโนมัติ ดูหัวข้อ "ระบบ Animation" ด้านล่าง)
- [x] ระบบ Combat: Combo 3 จังหวะ, hitbox, knockback, damage feedback
- [x] ระบบ Skill: Chakra, cooldown, VFX, ultimate และ transform
- [x] ระบบ Enemy AI: Scout/Brute, wind-up attack และ hit stun
- [x] ระบบ Boss: Kage Lord พร้อม phase 2 เมื่อ HP ต่ำกว่า 50%
- [x] ระบบ Stage: 3 waves + boss, victory/defeat loop และ restart
- [x] ระบบ UI/HUD: HP/Chakra/EXP, cooldown, objective และ end screen
- [ ] Save/บัญชีผู้เล่นถาวร (ยังไม่จำเป็นสำหรับเกมต้นแบบรอบนี้)

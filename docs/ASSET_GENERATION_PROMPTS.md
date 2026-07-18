# Shadow Chronicles — asset generation prompts

The shipped artwork was generated as original character art. These prompts avoid copyrighted character names, logos, and costume copies.

## Prompts used for the current artwork

### Kaito — wind ninja hero

Create one original full-body 2D action-RPG character cutout: an agile young wind ninja hero named Kaito, strict side profile facing right, ready combat stance, sandy blond windswept hair, navy and warm amber layered shinobi-inspired outfit, cloth sash, light forearm guards, small original spiral-wind emblem that is not from any existing franchise, confident expression, both legs and both feet fully visible and separated, no cropped body parts. Premium hand-painted pixel-art-inspired game illustration with crisp silhouette, readable at small size, subtle cyan wind accents, consistent overhead-left lighting, no cast shadow. Centered single character only, flat solid pure magenta background #FF00FF, no text, no UI, no border, no watermark, no copyrighted characters, no Naruto identifiers, 3:2 landscape canvas.

### Ren — cursed-shadow ninja hero

Create one original full-body 2D action-RPG character cutout: a fast cursed-shadow ninja named Ren, strict side profile facing right, low ready combat stance, black swept hair, narrow silver eye guard, charcoal and deep violet layered outfit, short asymmetrical mantle, original geometric crest not from any existing franchise, violet spectral energy around one hand, both legs and both feet fully visible and separated, no cropped body parts. Premium hand-painted pixel-art-inspired game illustration with crisp silhouette, readable at small size, subtle purple rim light, consistent overhead-left lighting, no cast shadow. Centered single character only, flat solid pure magenta background #FF00FF, no text, no UI, no border, no watermark, no copyrighted characters, no Sasuke identifiers, 3:2 landscape canvas.

### Shadow scout

Create one original full-body 2D action-RPG enemy cutout: agile masked shadow scout, strict side profile facing left, crouched stalking combat stance, layered navy and black cloth armor, teal scarf ribbons, cyan eye slit, short forearm blades, slim athletic silhouette, both legs and feet fully visible and separated, no cropped body parts. Premium hand-painted pixel-art-inspired game illustration, crisp readable silhouette at small size, cool cyan rim light, consistent overhead-left lighting, no cast shadow. Centered single enemy only, flat solid pure magenta background #FF00FF, no text, no UI, no border, no watermark, no copyrighted character, 3:2 landscape canvas.

### Shadow brute

Create one original full-body 2D action-RPG enemy cutout: heavy shadow brute, strict side profile facing left, grounded combat stance, massive armored build, dark crimson lamellar armor over charcoal cloth, hornless angular iron mask with small amber eye slit, one huge reinforced gauntlet and one heavy cleaver at the hip, both legs and feet fully visible and separated, no cropped body parts. Premium hand-painted pixel-art-inspired game illustration, crisp readable silhouette at small size, warm red edge light, consistent overhead-left lighting, no cast shadow. Centered single enemy only, flat solid pure magenta background #FF00FF, no text, no UI, no border, no watermark, no copyrighted character, 3:2 landscape canvas.

### Kage Lord boss

Create one original full-body 2D action-RPG boss cutout: Kage Lord, strict side profile facing left, imposing upright combat stance, tall athletic warlord, cracked crescent-shaped obsidian mask with bright violet eye, layered indigo-black ceremonial armor, torn long mantle flowing behind, large spectral violet blade formed from shadow energy in one hand, ominous but elegant silhouette, both legs and feet fully visible and separated, no cropped body parts. Premium hand-painted pixel-art-inspired game illustration, crisp readable silhouette at small size, strong violet rim light, consistent overhead-left lighting, no cast shadow. Centered single boss only, flat solid pure magenta background #FF00FF, no text, no UI, no border, no watermark, no copyrighted character, 3:2 landscape canvas.

## Gemini prompt for a real animation sheet

Use this if you later want frame-by-frame animation instead of the current procedural movement. Replace `[CHARACTER DESCRIPTION]` and `[ACTION]`.

> Create a production-ready sprite sheet for an original 2D side-scrolling action-RPG character. Character: [CHARACTER DESCRIPTION]. Action: [ACTION]. Exactly 8 frames in one horizontal row, strict side profile facing right, identical anatomy, costume, scale, camera, ground line, and lighting in every frame. Every frame must show the complete body including both legs and both feet; nothing may touch or cross a cell boundary. Use a 1024x128 canvas divided into eight equal 128x128 cells. Transparent background. No labels, guide lines, shadows, extra objects, UI, logos, watermark, or copyrighted character references. Smooth anticipation, contact, follow-through, and recovery; first and last frames must loop seamlessly when the action is idle/run.

Recommended separate actions: `idle (8 frames)`, `run (8 frames)`, `jump ascent (4 frames)`, `fall (4 frames)`, `light attack combo 1/2/3 (6 frames each)`, `hurt (4 frames)`, and `knockout (6 frames)`.

## Gemini prompt for skill VFX sheets

> Create a production-ready sprite sheet for one original 2D action-RPG skill effect: [SKILL DESCRIPTION]. Exactly 12 frames in one horizontal row on a 1536x128 transparent canvas, each frame 128x128. Electric cyan and deep violet palette with a bright white core, additive-energy look, clear anticipation, expansion, impact, dissipation, and a clean final transparent frame. Keep the effect centered and fully inside every cell. No character, scenery, text, UI, borders, guide lines, logos, or watermark.


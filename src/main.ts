import Phaser from 'phaser';
import { SCREEN, PHYSICS, DEBUG } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { StageScene } from './scenes/StageScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN.WIDTH,
  height: SCREEN.HEIGHT,
  parent: 'app',
  backgroundColor: '#0f0f1a',
  pixelArt: false,
  antialias: true,
  render: {
    antialias: true,
    roundPixels: true,
  },
  fps: {
    target: 60,
    min: 30,
    smoothStep: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.GRAVITY_Y },
      debug: DEBUG.SHOW_HITBOXES,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MainMenuScene, StageScene, UIScene],
};

new Phaser.Game(config);

import Phaser from 'phaser';
import { W, H } from './config/GameConfig.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import LevelTransition from './scenes/LevelTransition.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '#000011',
  parent: 'game-container',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  render: { pixelArt: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, LevelTransition, GameScene, UIScene, GameOverScene],
});

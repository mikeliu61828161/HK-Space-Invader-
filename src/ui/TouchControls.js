import { W, H } from '../config/GameConfig.js';

export default class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.leftDown  = false;
    this.rightDown = false;
    this.fireDown  = false;
    this.fireJustPressed = false;
    this._firePrev = false;

    const btnY  = H - 90;
    const alpha = 0.38;

    // ── Left button ────────────────────────────────────────────
    const leftBg = scene.add.graphics().setDepth(50);
    leftBg.fillStyle(0x222244, alpha); leftBg.fillRoundedRect(12, btnY - 40, 80, 80, 14);
    leftBg.lineStyle(2, 0x8888ff, 0.7); leftBg.strokeRoundedRect(12, btnY - 40, 80, 80, 14);
    scene.add.text(52, btnY, '◀', { fontSize:'32px', color:'#ffffff' }).setOrigin(0.5).setDepth(51).setAlpha(0.8);
    const leftZone = scene.add.zone(52, btnY, 80, 80).setInteractive().setDepth(52);
    leftZone.on('pointerdown', () => { this.leftDown = true;  leftBg.setAlpha(0.7); });
    leftZone.on('pointerup',   () => { this.leftDown = false; leftBg.setAlpha(alpha); });
    leftZone.on('pointerout',  () => { this.leftDown = false; leftBg.setAlpha(alpha); });

    // ── Right button ───────────────────────────────────────────
    const rightBg = scene.add.graphics().setDepth(50);
    rightBg.fillStyle(0x222244, alpha); rightBg.fillRoundedRect(100, btnY - 40, 80, 80, 14);
    rightBg.lineStyle(2, 0x8888ff, 0.7); rightBg.strokeRoundedRect(100, btnY - 40, 80, 80, 14);
    scene.add.text(140, btnY, '▶', { fontSize:'32px', color:'#ffffff' }).setOrigin(0.5).setDepth(51).setAlpha(0.8);
    const rightZone = scene.add.zone(140, btnY, 80, 80).setInteractive().setDepth(52);
    rightZone.on('pointerdown', () => { this.rightDown = true;  rightBg.setAlpha(0.7); });
    rightZone.on('pointerup',   () => { this.rightDown = false; rightBg.setAlpha(alpha); });
    rightZone.on('pointerout',  () => { this.rightDown = false; rightBg.setAlpha(alpha); });

    // ── Fire button ────────────────────────────────────────────
    const fireBg = scene.add.graphics().setDepth(50);
    fireBg.fillStyle(0x442222, alpha); fireBg.fillCircle(W - 70, btnY, 50);
    fireBg.lineStyle(3, 0xff4444, 0.8); fireBg.strokeCircle(W - 70, btnY, 50);
    scene.add.text(W - 70, btnY, '🔥', { fontSize:'28px' }).setOrigin(0.5).setDepth(51);
    const fireZone = scene.add.zone(W - 70, btnY, 100, 100).setInteractive().setDepth(52);
    fireZone.on('pointerdown', () => { this.fireDown = true;  fireBg.setAlpha(0.8); });
    fireZone.on('pointerup',   () => { this.fireDown = false; fireBg.setAlpha(alpha); });
    fireZone.on('pointerout',  () => { this.fireDown = false; fireBg.setAlpha(alpha); });
  }

  update() {
    this.fireJustPressed = this.fireDown && !this._firePrev;
    this._firePrev = this.fireDown;
  }

  destroy() {}
}

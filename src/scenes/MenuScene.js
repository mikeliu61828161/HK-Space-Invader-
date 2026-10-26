import Phaser from 'phaser';
import { W, H, HK_LOCATIONS } from '../config/GameConfig.js';
import SM from '../ui/SoundManager.js';
import { FACE_DOWN_ANGLE } from '../config/orientation.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    SM.init();
    // ── background: Victoria Harbour night ──────────────────────
    const bg = this.add.image(W/2, H/2, 'harbour');
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale).setScrollFactor(0);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.35);
    overlay.fillRect(0, 0, W, H);

    this.children.sendToBack(overlay);
    this.children.sendToBack(bg);

    // ── Title panel ─────────────────────────────────────────────
    const cx = W / 2;
    // Roblox-style top panel
    this.add.rectangle(cx, 160, 340, 110, 0x000000, 0.7);
    this.add.rectangle(cx, 160, 340, 110).setStrokeStyle(3, 0xffd700);

    const title1 = this.add.text(cx, 128, 'HK SKY', {
      fontSize: '52px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#ffd700', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    const title2 = this.add.text(cx, 182, 'INVADERS', {
      fontSize: '44px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#cc0000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    // ── J-20 player ship display ─────────────────────────────────
    const ship = this.add.image(cx, 310, 'j20').setScale(2.5).setAlpha(0);

    // ── Subtitle ─────────────────────────────────────────────────
    this.add.text(cx, 380, 'Defend Hong Kong with the J-20 Mighty Dragon', {
      fontSize: '13px', fontFamily: 'Arial', color: '#aaccff',
      wordWrap: { width: 300 },
    }).setOrigin(0.5).setAlpha(0.85);

    this.add.text(cx, 420, '99 LEVELS  •  6 POWER-UPS  •  BOSS BATTLES', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffcc44',
    }).setOrigin(0.5).setAlpha(0.9);

    // ── High scores ───────────────────────────────────────────────
    const scores = this._loadScores();
    const maxScores = Math.min(scores.length, 5);

    const panelTop = 460;
    const panelHeight = maxScores === 0 ? 80 : 50 + maxScores * 26;
    const panelCenterY = panelTop + panelHeight / 2;

    const spanel = this.add.rectangle(cx, panelCenterY, 300, panelHeight, 0x000000, 0.6);
    this.add.rectangle(cx, panelCenterY, 300, panelHeight).setStrokeStyle(2, 0x4488ff);

    this.add.text(cx, panelTop + 22, '🏆 HIGH SCORES', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    if (maxScores === 0) {
      this.add.text(cx, panelTop + 50, 'No scores yet — be the first!', { fontSize: '13px', color: '#aaaaaa' }).setOrigin(0.5);
    } else {
      scores.slice(0, maxScores).forEach((s, i) => {
        const itemY = panelTop + 48 + i * 26;
        this.add.text(cx - 80, itemY, `${i + 1}.`, { fontSize: '14px', color: '#ffcc44' }).setOrigin(0);
        this.add.text(cx + 80, itemY, `${s.score.toLocaleString()}  Lv${s.level}`, { fontSize: '14px', color: '#ffffff' }).setOrigin(1, 0);
      });
    }

    // ── START button ─────────────────────────────────────────────
    const btnY = 710;
    const btn = this.add.rectangle(cx, btnY, 220, 60, 0x22cc44).setInteractive({ useHandCursor: true });
    this.add.rectangle(cx, btnY, 220, 60).setStrokeStyle(3, 0x88ff88);
    const btnTxt = this.add.text(cx, btnY, '▶  START GAME', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#006622', strokeThickness: 4,
    }).setOrigin(0.5);

    btn.on('pointerover', () => { btn.setFillStyle(0x44ee66); });
    btn.on('pointerout',  () => { btn.setFillStyle(0x22cc44); });
    btn.on('pointerdown', () => {
      SM.menuClick();
      this.registry.set('level', 1);
      this.registry.set('score', 0);
      this.registry.set('lives', 3);
      this.registry.set('powerupLevel', 0);
      // Test shortcut: open the game with ?level=10 to start at that level
      const q = parseInt(new URLSearchParams(window.location.search).get('level'), 10);
      const startLevel = (q >= 1 && q <= 99) ? q : 1;
      this.registry.set('level', startLevel);
      this.scene.start('GameScene', { level: startLevel });
    });

    // ── Version/credit ────────────────────────────────────────────
    this.add.text(cx, H - 20, 'v1.0  —  HK Sky Invaders', {
      fontSize: '10px', color: '#445566',
    }).setOrigin(0.5);

    // ── Entrance animations ───────────────────────────────────────
    this.tweens.add({ targets: title1, alpha: 1, y: 120, duration: 600, ease: 'Back.Out' });
    this.tweens.add({ targets: title2, alpha: 1, y: 182, duration: 700, ease: 'Back.Out', delay: 150 });
    this.tweens.add({ targets: ship,   alpha: 1, duration: 800, delay: 300,
      onComplete: () => {
        this.tweens.add({ targets: ship, y: 315, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });

    // Enemy preview — animate small enemies flying across top
    this._spawnPreviewEnemies();
  }

  _spawnPreviewEnemies() {
    ['invader1','invader2','invader3','invader4','invader5'].forEach((key, i) => {
      // Source images are ~1024px; scale to ~40px; SCREEN blend removes black BG
      const e = this.add.image(-30, 70, key)
        .setScale(0.04)
        .setAngle(FACE_DOWN_ANGLE[key] ?? 180)
        .setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: e, x: W + 30, duration: 3000 + i * 300,
        delay: i * 500, repeat: -1, ease: 'Linear',
        onRepeat: () => { e.y = Phaser.Math.Between(60, 200); }
      });
    });
  }

  _loadScores() {
    try { return JSON.parse(localStorage.getItem('hksi_scores') || '[]'); }
    catch { return []; }
  }
}

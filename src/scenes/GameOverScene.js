import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(data) {
    const { score, level, won } = data;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.rectangle(0, 0, cx*2, cy*2, 0x0a0a1a).setOrigin(0);

    const titleStr = won ? '🏆 VICTORY! 🏆' : 'GAME OVER';
    const titleCol = won ? '#ffd700' : '#ff2222';
    
    this.add.text(cx, 120, titleStr, {
      font: 'bold 42px Arial Black', color: titleCol, stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(cx, 200, 'FINAL SCORE', { font: '20px Arial', color: '#aaaaaa' }).setOrigin(0.5);
    this.add.text(cx, 240, score.toLocaleString(), { font: 'bold 48px Arial', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(cx, 290, `Reached Level ${level}`, { font: '24px Arial', color: '#44aaff' }).setOrigin(0.5);

    // High Scores
    let scores = [];
    try { scores = JSON.parse(localStorage.getItem('hksi_scores') || '[]'); } catch (e) {}
    scores.push({ score, level });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);
    localStorage.setItem('hksi_scores', JSON.stringify(scores));

    const spanel = this.add.rectangle(cx, 450, 300, scores.length*26 + 40, 0x000000, 0.6);
    this.add.rectangle(cx, 450, 300, spanel.height).setStrokeStyle(2, 0x4488ff);
    this.add.text(cx, 450 - spanel.height/2 + 15, 'HIGH SCORES', { font: 'bold 16px Arial', color: '#ffd700' }).setOrigin(0.5);
    
    scores.forEach((s, i) => {
      const y = 450 - spanel.height/2 + 45 + i*26;
      const c = (s.score === score && s.level === level) ? '#00ff88' : '#ffffff';
      this.add.text(cx - 80, y, `${i+1}.`, { font: '16px Arial', color: '#ffcc44' }).setOrigin(0);
      this.add.text(cx + 80, y, `${s.score.toLocaleString()} (Lv${s.level})`, { font: '16px Arial', color: c }).setOrigin(1, 0);
    });

    // Buttons — store their hitboxes for scene-level pointer detection
    this._buttons = [];

    const playAgainCb = () => {
      console.log('[GameOverScene] Play Again clicked');
      this.registry.set('level', 1);
      this.registry.set('score', 0);
      this.registry.set('lives', 3);
      this.registry.set('powerupLevel', 0);
      this.scene.stop('GameOverScene');
      this.scene.start('GameScene', { level: 1 });
    };

    this._makeBtn(cx, 650, 'PLAY AGAIN', 0x22cc44, playAgainCb);
    this._makeBtn(cx, 730, 'MAIN MENU', 0x222244, () => {
      console.log('[GameOverScene] Main Menu clicked');
      this.scene.start('MenuScene');
    });

    // ── Scene-level pointer handler (most reliable in Phaser 3) ──────────
    // Catches ALL clicks on the canvas and dispatches to whichever button
    // the pointer is inside — bypasses game-object input stacking entirely.
    this.input.on('pointerdown', (pointer) => {
      console.log(`[GameOverScene] pointerdown at game coords (${Math.round(pointer.x)}, ${Math.round(pointer.y)})`);
      for (const btn of this._buttons) {
        if (Phaser.Geom.Rectangle.Contains(btn.rect, pointer.x, pointer.y)) {
          btn.callback();
          return;
        }
      }
    });

    // Keyboard shortcut: Enter or Space → Play Again
    this.input.keyboard.once('keydown-ENTER', playAgainCb);
    this.input.keyboard.once('keydown-SPACE', playAgainCb);

    console.log('[GameOverScene] create() done — buttons at y=650, y=730; canvas', cx*2, 'x', cy*2);
  }

  _makeBtn(x, y, text, color, callback) {
    // Visual only — hit detection is handled by scene-level pointerdown above
    this.add.rectangle(x, y, 220, 50, color).setStrokeStyle(2, 0xffffff);
    this.add.text(x, y, text, { font: 'bold 20px Arial', color: '#ffffff' }).setOrigin(0.5);

    // Register hit-rect for scene-level pointer handler
    const rect = new Phaser.Geom.Rectangle(x - 110, y - 25, 220, 50);
    this._buttons.push({ rect, callback });
  }
}

export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    // Read initial values from registry so Text objects are populated
    // at construction time — avoids setText() being called on a canvas
    // that hasn't completed its first render frame yet.
    const initScore = this.registry.get('score') || 0;
    const initLives = this.registry.get('lives') !== null ? this.registry.get('lives') : 3;
    const initLevel = this.registry.get('level') || 1;

    const g = this.add.graphics();
    g.fillStyle(0x1a1a30, 0.85); g.fillRect(0, 0, 390, 40); // top bar
    g.lineStyle(2, 0xffd700); g.beginPath(); g.moveTo(0,40); g.lineTo(390,40); g.strokePath();

    this.scoreTxt = this.add.text(10, 10, `SCORE: ${initScore}`, { font: 'bold 16px Arial Black', color: '#ffd700' });
    this.lvlTxt   = this.add.text(380, 10, `LVL ${initLevel}`,   { font: 'bold 16px Arial Black', color: '#ffffff' }).setOrigin(1, 0);
    
    this.lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.image(150 + i*25, 20, 'icon_life');
      icon.setVisible(i < initLives);
      this.lifeIcons.push(icon);
    }

    // Boss HP Bar (hidden by default)
    this.bossHpBg   = this.add.rectangle(195, 60, 200, 15, 0x000000, 0.8).setStrokeStyle(2, 0xff0000).setVisible(false);
    this.bossHpFill = this.add.rectangle(95, 60, 200, 15, 0xff2222).setOrigin(0, 0.5).setVisible(false);

    // Listen to GameScene events for live HUD updates during play
    const gs = this.scene.get('GameScene');
    gs.events.on('score',   (sc)  => this.scoreTxt.setText(`SCORE: ${sc}`));
    gs.events.on('lives',   (lives) => { this.lifeIcons.forEach((icon, i) => icon.setVisible(i < lives)); });
    gs.events.on('level',   (lvl) => this.lvlTxt.setText(`LVL ${lvl}`));
    gs.events.on('boss_hp', (pct) => {
      if (pct < 0) {
        this.bossHpBg.setVisible(false); this.bossHpFill.setVisible(false);
      } else {
        this.bossHpBg.setVisible(true); this.bossHpFill.setVisible(true);
        this.bossHpFill.width = Math.max(0, 200 * pct);
      }
    });
  }
}


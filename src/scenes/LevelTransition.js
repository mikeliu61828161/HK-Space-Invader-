import Phaser from 'phaser';

export default class LevelTransition extends Phaser.Scene {
  constructor() { super('LevelTransition'); }

  create(data) {
    const { level, locationName, isBoss, powerupName } = data;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.rectangle(0, 0, cx*2, cy*2, 0x000000, 0.85).setOrigin(0);

    const txtLvl = this.add.text(cx, cy - 80, `LEVEL ${level}`, {
      font: 'bold 46px Arial Black', color: '#ffd700', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0).setY(cy - 120);

    const txtLoc = this.add.text(cx, cy - 20, locationName, {
      font: '24px Arial', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: txtLvl, y: cy - 80, alpha: 1, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: txtLoc, alpha: 1, duration: 600, delay: 300 });

    if (isBoss) {
      const txtBoss = this.add.text(cx, cy + 40, '⚠ BOSS INCOMING ⚠', {
        font: 'bold 28px Arial', color: '#ff2222'
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: txtBoss, alpha: 1, duration: 300, delay: 800, yoyo: true, repeat: 3 });
    }

    if (powerupName) {
      const txtPu = this.add.text(cx, cy + 40, `🆕 NEW WEAPON: ${powerupName}`, {
        font: 'bold 22px Arial', color: '#00ffff'
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: txtPu, alpha: 1, duration: 500, delay: 600 });
    }

    this.time.delayedCall(2500, () => {
      this.scene.start('GameScene', { level });
    });
  }
}

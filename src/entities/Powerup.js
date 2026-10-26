import { POWERUP_NAMES } from '../config/GameConfig.js';

export default class Powerup {
  constructor(scene, x, y, level) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'powerup_' + level);
    this.sprite.body.setVelocityY(150); // fall fast enough to reach the player

    this.label = scene.add.text(x, y + 25, POWERUP_NAMES[level-1], {
      font: 'bold 12px Arial', color: '#ffffff', backgroundColor: '#00000088'
    }).setOrigin(0.5);

    // Arrow pointing downward to prompt the player to collect
    this.arrow = scene.add.text(x, y + 50, '▼ COLLECT ▼', {
      font: 'bold 11px Arial', color: '#ffff00'
    }).setOrigin(0.5);
    scene.tweens.add({ targets: this.arrow, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    // Spin the powerup
    scene.tweens.add({
      targets: this.sprite, angle: 360, duration: 1200, repeat: -1, ease: 'Linear'
    });
  }

  update() {
    if (this.sprite.active) {
      this.label.x = this.sprite.x;
      this.label.y = this.sprite.y + 25;
      if (this.arrow) {
        this.arrow.x = this.sprite.x;
        this.arrow.y = this.sprite.y + 48;
      }
    }
  }

  collect(callback) {
    this.sprite.body.checkCollision.none = true;
    if (this.arrow) this.arrow.destroy();
    this.scene.tweens.add({
      targets: [this.sprite, this.label],
      scaleX: 1.5, scaleY: 1.5, alpha: 0,
      duration: 300,
      onComplete: () => {
        this.sprite.destroy();
        this.label.destroy();
        callback();
      }
    });
  }
}

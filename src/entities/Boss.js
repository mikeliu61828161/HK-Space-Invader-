import { W } from '../config/GameConfig.js';
import SM from '../ui/SoundManager.js';
import { FACE_DOWN_ANGLE } from '../config/orientation.js';

export default class Boss {
  constructor(scene, y, bossType, hp, speedMult, fireRateMult) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(W / 2, y, bossType);
    this.sprite.setAngle(FACE_DOWN_ANGLE[bossType] ?? 180);

    // Source images are ~1024px; scale to ~120px for regular bosses, ~140px for boss4
    if (bossType === 'boss4') {
      this.sprite.setScale(0.14);
    } else {
      this.sprite.setScale(0.12);
    }

    // SCREEN blend mode makes pure-black background pixels transparent
    this.sprite.setBlendMode(Phaser.BlendModes.SCREEN);

    const isRepeated = (bossType === 'boss1' && scene.level > 10) ||
                       (bossType === 'boss2' && scene.level > 20) ||
                       (bossType === 'boss3' && scene.level > 30);
    this.isRepeated = isRepeated;
    
    // Ensure hp is a valid number, fallback to 40 if undefined/NaN
    const initialHp = (typeof hp === 'number' && !isNaN(hp) && hp > 0) ? hp : 40;
    this.sprite.setData('hp', initialHp);
    this.maxHp = initialHp;
    
    // Scale boss bounding box to match the scaled display size
    this.sprite.body.setSize(this.sprite.width, this.sprite.height);
    this.sprite.setCollideWorldBounds(true);

    this.speed = 80 * speedMult;
    if (isRepeated) {
      this.sprite.setTint(0xff3333);
      this.fireRate = (1200 / fireRateMult) / 2;
    } else {
      this.fireRate = 1200 / fireRateMult; // ms between attacks
    }
    this.sprite.setVelocityX(this.speed);
    this.sprite.setBounce(1); // Bounce off walls

    this.lastFire = 0;
    this.patternState = 0;

    // Spawn invincibility: boss cannot take damage for the first 2 seconds
    this._spawnTime = Date.now();
    this._invincible = true;
    this._invincibleDuration = 2000; // 2 seconds

    // Flicker effect during invincibility
    this._flickerTween = scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: 'Linear'
    });



    // Invincibility timer: lift immunity after 2s
    scene.time.delayedCall(this._invincibleDuration, () => {
      if (!this.sprite || !this.sprite.active) return;
      this._invincible = false;
      if (this._flickerTween) { this._flickerTween.stop(); }
      this.sprite.setAlpha(1);
    });
  }

  update(time) {
    if (!this.sprite.active) return;



    // Fire patterns
    if (time > this.lastFire + this.fireRate) {
      this.lastFire = time;
      this.firePattern();
      this.patternState++;
    }
  }

  firePattern() {
    const x = this.sprite.x;
    const y = this.sprite.y + 30;

    // Pattern cycles through 3 different attacks
    const mod = this.patternState % 3;

    if (mod === 0) {
      // 3-way spread
      this.scene.fireEnemyBullet(x, y, 0);
      this.scene.fireEnemyBullet(x - 20, y, -0.3);
      this.scene.fireEnemyBullet(x + 20, y, 0.3);
      SM.enemyExplode(); // Use as heavy shot sound
    } else if (mod === 1) {
      // Fast straight burst
      this.scene.time.addEvent({
        delay: 150, repeat: 2,
        callback: () => {
          if(this.sprite.active) {
            this.scene.fireEnemyBullet(x - 15, y, 0);
            this.scene.fireEnemyBullet(x + 15, y, 0);
          }
        }
      });
      SM.shoot();
    } else {
      // 5-way wide fan
      [-0.6, -0.3, 0, 0.3, 0.6].forEach(vx => this.scene.fireEnemyBullet(x, y, vx));
      SM.enemyExplode();
    }
  }

  hit(damage) {
    // Block all damage during spawn invincibility
    if (this._invincible) {
      return false;
    }

    const currentHp = this.sprite.getData('hp');
    const validDmg = (typeof damage === 'number' && !isNaN(damage)) ? damage : 1;
    
    // Safely calculate new HP
    const hp = (typeof currentHp === 'number' && !isNaN(currentHp) ? currentHp : this.maxHp) - validDmg;
    this.sprite.setData('hp', hp);



    // Flash white when hit
    this.sprite.setTint(0xff5555);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.active) {
        if (this.isRepeated) {
          this.sprite.setTint(0xff3333);
        } else {
          this.sprite.clearTint();
        }
      }
    });

    if (hp <= 0) {
      this.explode();
      return true; // destroyed
    }
    return false; // still alive
  }

  explode() {
    const bx = this.sprite.x;
    const by = this.sprite.y;
    this.sprite.destroy();
    


    SM.bossExplode();
    // Big explosion effect
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        this.scene.spawnExplosion(
          bx + Phaser.Math.Between(-60, 60),
          by + Phaser.Math.Between(-40, 40),
          Phaser.Math.Between(2, 3) // larger explosions
        );
      });
    }
  }

  destroy() {
    if (this._flickerTween) { this._flickerTween.stop(); }
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
    }

  }
}

import Phaser from 'phaser';
import { W, H, PLAYER_SPEED, BULLET_SPD, EBULLET_SPD, SCORES, HK_LOCATIONS, POWERUP_NAMES } from '../config/GameConfig.js';
import { getLevelConfig, getBgIndex } from '../config/levels.js';
import { getShootConfig, POWERUPS } from '../config/powerups.js';
import TouchControls from '../ui/TouchControls.js';

const BG_KEYS = [
  'harbour', 'peak', 'tst', 'buddha', 'aberdeen',
  'mongkok', 'repulse', 'oceanpark', 'saikung', 'temple',
  'kowloon', 'disneyland', 'westkowloon', 'sky100', 'dawn'
];
import EnemyFormation from '../entities/EnemyFormation.js';
import Boss from '../entities/Boss.js';
import Powerup from '../entities/Powerup.js';
import SM from '../ui/SoundManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create(data) {
    this._isLevelCompleting = false;

    // Load initial state
    this.level = data.level || 1;
    this.score = this.registry.get('score') || 0;
    this.lives = this.registry.get('lives') || 3;
    this.powerupLevel = this.registry.get('powerupLevel') || 0;
    this._playerInvincible = false;

    // Kai Tak cargo power-up system
    this.cargoPowerLevel = 0;   // 0=none, 1=double, 2=triple, 3=1-sat, 4=2-sat, 5=neon
    this.satellites = [];       // active satellite sprites
    this._cargoPowerAngle = 0;  // current orbit angle (radians)
    this.neonInvincTimer = null;
    this._neonTween = null;

    // Typhoon Warning Mode state
    this.typhoonActive = false;
    this.windForce = 0;
    this.lastWindForce = 0;
    this.rainGraphics = null;
    this.rainParticles = [];
    this.typhoonText = null;
    this.typhoonSignalSprite = null;
    this.typhoonEndTimer = null;

    // Check for Typhoon Warning every 60 seconds
    this.typhoonCheckTimer = this.time.addEvent({
      delay: 60000,
      callback: () => {
        if (Phaser.Math.Between(1, 100) <= 30) {
          this.triggerTyphoon();
        }
      },
      callbackScope: this,
      loop: true
    });

    // Persistent physics groups
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.bonusPlaneGroup = this.physics.add.group();
    this.cargoGroup = this.physics.add.group();

    // Player J-20 (created once, active across all levels)
    this.player = this.physics.add.sprite(W/2, H - 160, 'j20');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 40); // smaller hitbox for fair dodging

    // Inputs (created once)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('SPACE');
    this.controls = new TouchControls(this);

    // Shooting state
    this.lastFired = 0;

    // Background images and overlays
    this.bgImage = null;
    this.bgOverlay = null;

    // Level-specific dynamic entities and overlaps
    this.boss = null;
    this.formation = null;
    this.activePowerup = null;
    this.levelColliders = [];

    // Persistent Overlaps (created once)
    this.physics.add.overlap(this.player, this.enemyBullets, this.onHitPlayer, null, this);
    this.physics.add.overlap(this.playerBullets, this.bonusPlaneGroup, this.onHitBonusPlane, null, this);
    this.physics.add.overlap(this.player, this.cargoGroup, this.onCollectCargo, null, this);

    // Launch UI Scene if not running
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // Start Level 1 (or starting level)
    this._startLevel(true);
    // Start the bonus plane timer ONCE for the entire session.
    // It self-reschedules and must NOT be reset per level.
    this.scheduleBonusPlane();
  }

  _startLevel(showBanner = true) {
    // 1. Core level configuration
    this._bossDefeated = false;
    this.endTyphoon(true); // Clean up any active Typhoon state from previous wave
    const conf = getLevelConfig(this.level);
    this.isBossLevel = conf.isBoss;
    const bgIdx = getBgIndex(this.level);
    const locName = HK_LOCATIONS[bgIdx];

    // 2. Clean up old level entities
    // Clear bullets
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.bonusPlaneGroup.clear(true, true);
    this.cargoGroup.clear(true, true);

    // Destroy old entities
    if (this.formation) {
      if (this.formation.group) this.formation.group.destroy(true);
      this.formation = null;
    }
    if (this.boss) {
      if (this.boss.sprite) this.boss.sprite.destroy();
      this.boss = null;
    }
    if (this.activePowerup) {
      this.activePowerup.destroy();
      this.activePowerup = null;
    }

    // Destroy old colliders
    if (this.levelColliders) {
      this.levelColliders.forEach(c => {
        try { c.destroy(); } catch (e) {}
      });
    }
    this.levelColliders = [];

    // Redraw background
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.bgOverlay) {
      this.bgOverlay.destroy();
      this.bgOverlay = null;
    }
    const bgKey = BG_KEYS[bgIdx] || 'harbour';
    this.bgImage = this.add.image(W/2, H/2, bgKey);
    const scale = Math.max(W / this.bgImage.width, H / this.bgImage.height);
    this.bgImage.setScale(scale).setScrollFactor(0);

    // Dimming overlay
    this.bgOverlay = this.add.graphics();
    this.bgOverlay.fillStyle(0x000000, 0.35);
    this.bgOverlay.fillRect(0, 0, W, H);

    this.children.sendToBack(this.bgOverlay);
    this.children.sendToBack(this.bgImage);

    // Reset player position and state
    this.tweens.killTweensOf(this.player);
    this.player.setPosition(W/2, H - 160);
    this.player.setActive(true).setVisible(true);
    this.player.alpha = 1;
    this.player.body.enable = false; // Disable physics during transition banner
    this._playerInvincible = false;

    // Reset shooting cooldown
    this.lastFired = 0;

    // Defer HUD update by one frame so UIScene's Text canvases are fully
    // committed to the renderer before setText() is called on them.
    this.time.delayedCall(0, () => {
      this.events.emit('score', this.score);
      this.events.emit('lives', this.lives);
      this.events.emit('level', this.level);
      this.events.emit('boss_hp', -1);
    });

    if (this.isBossLevel) {
      SM.bossAlert();
    }

    if (showBanner) {
      this._isLevelCompleting = true;
      const cx = W / 2, cy = H / 2;

      // Dark Overlay
      const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0).setDepth(200);
      this.tweens.add({ targets: overlay, fillAlpha: 0.85, duration: 400 });

      // Level text
      const txtLvl = this.add.text(cx, cy - 80, `LEVEL ${this.level}`, {
        font: 'bold 46px Arial Black', color: '#ffd700', stroke: '#000000', strokeThickness: 6
      }).setOrigin(0.5).setDepth(201).setAlpha(0);
      this.tweens.add({ targets: txtLvl, alpha: 1, duration: 500, delay: 300, ease: 'Back.out' });

      // Location text
      const txtLoc = this.add.text(cx, cy - 10, locName, {
        font: '24px Arial', color: '#ffffff'
      }).setOrigin(0.5).setDepth(201).setAlpha(0);
      this.tweens.add({ targets: txtLoc, alpha: 1, duration: 500, delay: 600 });

      // Boss text
      let txtBoss = null;
      if (this.isBossLevel) {
        txtBoss = this.add.text(cx, cy + 50, '⚠ BOSS INCOMING ⚠', {
          font: 'bold 26px Arial', color: '#ff2222'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);
        this.tweens.add({ targets: txtBoss, alpha: 1, duration: 300, delay: 900, yoyo: true, repeat: 3 });
      }

      // New weapon text if weapon upgraded
      let txtPu = null;
      if (this.level % 10 === 1 && this.powerupLevel > 0) {
        const puName = POWERUP_NAMES[this.powerupLevel - 1];
        txtPu = this.add.text(cx, cy + 50, `🆕 NEW WEAPON: ${puName}`, {
          font: 'bold 22px Arial', color: '#00ffff'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);
        this.tweens.add({ targets: txtPu, alpha: 1, duration: 500, delay: 800 });
      }

      // 2.5s timer to fade out overlay and start playing
      this.time.delayedCall(2500, () => {
        const targets = [overlay, txtLvl, txtLoc];
        if (txtBoss) targets.push(txtBoss);
        if (txtPu) targets.push(txtPu);

        this.tweens.add({
          targets: targets,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            // Destroy overlays
            overlay.destroy();
            txtLvl.destroy();
            txtLoc.destroy();
            if (txtBoss) txtBoss.destroy();
            if (txtPu) txtPu.destroy();

            // Spawn entities and enable player body
            this._spawnLevelEntities(conf);
            this.player.body.enable = true;
            this._isLevelCompleting = false;
          }
        });
      });
    } else {
      // Just spawn entities immediately and play
      this._spawnLevelEntities(conf);
      this.player.body.enable = true;
      this._isLevelCompleting = false;
    }
  }

  _spawnLevelEntities(conf) {
    if (this.isBossLevel) {
      this.boss = new Boss(this, 120, conf.bossType, conf.bossHp, conf.speedMult, conf.fireRateMult);
      this.formation = null;

      // Boss overlaps
      this.levelColliders.push(this.physics.add.overlap(this.playerBullets, this.boss.sprite, this.onHitBoss, null, this));
      this.levelColliders.push(this.physics.add.overlap(this.player, this.boss.sprite, this.onCrashEnemy, null, this));
    } else {
      this.boss = null;
      this.formation = new EnemyFormation(this, conf.cols, conf.rows, conf.enemyTypes, conf.speedMult, conf.fireRateMult);

      // Formation overlaps
      this.levelColliders.push(this.physics.add.overlap(this.playerBullets, this.formation.group, this.onHitEnemy, null, this));
      this.levelColliders.push(this.physics.add.overlap(this.player, this.formation.group, this.onCrashEnemy, null, this));
    }
  }

  scheduleBonusPlane() {
    this.bonusPlaneTimer = this.time.addEvent({
      delay: Phaser.Math.Between(8000, 15000), // 8-15s — appears ~once per level or two
      callback: this.spawnBonusPlane,
      callbackScope: this
    });
  }

  spawnBonusPlane() {
    if (this._isLevelCompleting || !this.player.active) return; // skip if level is done
    
    const startLeft = Phaser.Math.Between(0, 1) === 0;
    const x = startLeft ? -40 : W + 40;
    const y = 90; // below the score bar HUD
    
    const plane = this.bonusPlaneGroup.create(x, y, 'bonus_plane');
    if (startLeft) plane.setFlipX(true); // nose points right when flying rightward
    plane.setVelocityX(startLeft ? 100 : -100);
    plane.setData('hp', 1);

    // Schedule next plane
    this.scheduleBonusPlane();
  }

  onHitBonusPlane(obj1, obj2) {
    let bullet, plane;
    if (obj1.texture && obj1.texture.key === 'bonus_plane') { plane = obj1; bullet = obj2; }
    else { plane = obj2; bullet = obj1; }

    if (!bullet.active || !plane.active) return;
    
    const pierce = bullet.getData('pierce');
    if (!pierce) {
      bullet.body.enable = false;
      bullet.destroy();
    }
    
    // Spawn Cargo Container
    const cargo = this.cargoGroup.create(plane.x, plane.y, 'cargo_container');
    cargo.setVelocityY(110); // Faster float under parachute
    
    this.spawnExplosion(plane.x, plane.y, 2);
    SM.enemyExplode();
    plane.destroy();
  }

  onCollectCargo(player, cargo) {
    if (!cargo.active) return;
    
    cargo.body.enable = false;
    this.tweens.add({
      targets: cargo, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 300,
      onComplete: () => cargo.destroy()
    });
    
    SM.powerup();
    
    // Increment tier, capped at 5
    if (this.cargoPowerLevel < 5) this.cargoPowerLevel++;
    this._applyCargoPower();
  }

  _applyCargoPower() {
    const TIER_NAMES = [
      'SINGLE BARREL', 'DOUBLE BARREL', 'TRIPLE BARREL',
      'SHIELD SATELLITE', 'DUAL SATELLITES', '✦ NEON INVINCIBILITY'
    ];
    const TIER_COLORS = [
      '#ffffff', '#ffff00', '#ffaa00', '#00ffff', '#00ffff', '#ff00ff'
    ];
    const lvl = this.cargoPowerLevel;
    const name = TIER_NAMES[lvl];
    const color = TIER_COLORS[lvl];

    // Show tier label
    const lbl = this.add.text(this.player.x, this.player.y - 40, `✦ ${name} ACTIVE`, {
      font: 'bold 14px Arial', color
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: lbl, y: this.player.y - 90, alpha: 0, duration: 2000, onComplete: () => lbl.destroy() });

    if (lvl < 3) {
      this._destroySatellites();
    } else if (lvl === 3) {
      if (this.satellites.length !== 1) {
        this._destroySatellites();
        this._spawnSatellite(0);
      }
    } else if (lvl === 4) {
      if (this.satellites.length !== 2) {
        this._destroySatellites();
        this._spawnSatellite(0);
        this._spawnSatellite(Math.PI);
      }
    } else if (lvl === 5) {
      // Neon invincibility for 5 seconds then settle at tier 4
      this._playerInvincible = true;
      if (this.satellites.length !== 2) {
        this._destroySatellites();
        this._spawnSatellite(0);
        this._spawnSatellite(Math.PI);
      }
      if (this._neonTween) { this._neonTween.stop(); this._neonTween = null; }
      this._neonTween = this.tweens.add({
        targets: this.player,
        tint: { from: 0xff00ff, to: 0x00ffff },
        duration: 120, yoyo: true, repeat: -1
      });
      if (this.neonInvincTimer) { this.neonInvincTimer.remove(); this.neonInvincTimer = null; }
      this.neonInvincTimer = this.time.addEvent({
        delay: 5000,
        callback: () => {
          this._playerInvincible = false;
          if (this._neonTween) { this._neonTween.stop(); this._neonTween = null; }
          this.player.clearTint();
          // Revert to tier 4
          this.cargoPowerLevel = 4;
          this._applyCargoPower();
        }
      });
    }
  }

  _spawnSatellite(angleOffset) {
    const ORBIT_RADIUS = 36;
    const sat = this.add.sprite(
      this.player.x + Math.cos(angleOffset) * ORBIT_RADIUS,
      this.player.y + Math.sin(angleOffset) * ORBIT_RADIUS,
      'satellite_drone'
    );
    sat.setDepth(5);
    sat._angleOffset = angleOffset;
    this.satellites.push(sat);
  }

  _destroySatellites() {
    for (const sat of this.satellites) {
      if (sat && sat.active) sat.destroy();
    }
    this.satellites = [];
  }

  _resetCargoPower() {
    this.cargoPowerLevel = 0;
    this._destroySatellites();
    if (this.neonInvincTimer) { this.neonInvincTimer.remove(); this.neonInvincTimer = null; }
    if (this._neonTween) { this._neonTween.stop(); this._neonTween = null; }
    this.player.clearTint();
    this._cargoPowerAngle = 0;
  }

  onHitSatellite(bullet, sat) {
    if (!bullet.active || !sat.active) return;
    bullet.body.enable = false;
    bullet.destroy();
    // Remove satellite from tracking array
    const idx = this.satellites.indexOf(sat);
    if (idx !== -1) this.satellites.splice(idx, 1);
    this.spawnExplosion(bullet.x, bullet.y, 0); // explosion at collision point on orbit
    this.spawnExplosion(sat.x, sat.y, 0);       // explosion of satellite drone
    sat.destroy();
    // Decrement tier if we lost a satellite
    if (this.cargoPowerLevel > 2) {
      this.cargoPowerLevel = Math.max(2, this.cargoPowerLevel - 1);
      this._applyCargoPower();
    }
  }

  _updateSatellites(delta) {
    if (this.satellites.length === 0) return;
    const ORBIT_SPEED = 0.0025; // radians per ms
    const ORBIT_RADIUS = 36;
    this._cargoPowerAngle += ORBIT_SPEED * delta;

    for (let i = 0; i < this.satellites.length; i++) {
      const sat = this.satellites[i];
      if (sat && sat.active) {
        const angle = this._cargoPowerAngle + sat._angleOffset;
        sat.setPosition(
          this.player.x + Math.cos(angle) * ORBIT_RADIUS,
          this.player.y + Math.sin(angle) * ORBIT_RADIUS
        );
        sat.rotation += 0.05; // spin the drone
      }
    }

    if (this._playerInvincible) return; // skip checking when player is invincible

    // Manual distance check to player's orbit for collisions
    const bullets = this.enemyBullets.getChildren();
    for (const bullet of bullets) {
      if (bullet.active && bullet.body && bullet.body.enable) {
        const dx = bullet.x - this.player.x;
        const dy = bullet.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= ORBIT_RADIUS) {
          const sat = this.satellites[this.satellites.length - 1];
          if (sat) {
            this.onHitSatellite(bullet, sat);
            break; // Intercepted one bullet, stop checking others this frame
          }
        }
      }
    }
  }

  triggerTyphoon() {
    if (this.typhoonActive || this._isLevelCompleting || !this.player.active) return;

    this.typhoonActive = true;

    // Pick random direction: left (-1) or right (1)
    const dir = Math.random() < 0.5 ? -1 : 1;
    // Drift velocity
    this.windForce = dir * 140;
    this.lastWindForce = this.windForce;

    // Sound warning
    SM.bossAlert();

    // Spawn visual warning text
    const textDir = dir < 0 ? '◀ WESTERLY GALE' : '▶ EASTERLY GALE';
    this.typhoonText = this.add.text(W/2, H/2 - 100, `⚠ TYPHOON SIGNAL NO. 8 ⚠\n${textDir}`, {
      font: 'bold 20px Arial Black', color: '#ffaa00', align: 'center',
      stroke: '#000000', strokeThickness: 5,
      shadow: { color: '#ffaa00', fill: true, blur: 10, x: 0, y: 0 }
    }).setOrigin(0.5).setDepth(150);

    // Spawn warning signal icon
    const signalKey = dir < 0 ? 'tc8sw' : 'tc8ne';
    this.typhoonSignalSprite = this.add.sprite(W/2, H/2 - 165, signalKey)
      .setOrigin(0.5)
      .setDepth(150)
      .setScale(1.2);

    // Fade out warning text and signal icon after 3 seconds
    this.tweens.add({
      targets: [this.typhoonText, this.typhoonSignalSprite],
      alpha: 0,
      duration: 500,
      delay: 2500,
      onComplete: () => {
        if (this.typhoonText) {
          this.typhoonText.destroy();
          this.typhoonText = null;
        }
        if (this.typhoonSignalSprite) {
          this.typhoonSignalSprite.destroy();
          this.typhoonSignalSprite = null;
        }
      }
    });

    // Spawn graphics for rain
    this.rainGraphics = this.add.graphics().setDepth(2); // above background but below J20

    // Set up rain particles
    this.rainParticles = [];
    for (let i = 0; i < 35; i++) {
      this.rainParticles.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        speed: Phaser.Math.Between(12, 22)
      });
    }

    // Schedule Typhoon to end after 12 seconds
    this.typhoonEndTimer = this.time.addEvent({
      delay: 12000,
      callback: () => this.endTyphoon(false),
      callbackScope: this
    });
  }

  endTyphoon(silent = false) {
    if (!this.typhoonActive) return;

    this.typhoonActive = false;
    this.windForce = 0;

    // Clean up timers
    if (this.typhoonEndTimer) {
      this.typhoonEndTimer.remove();
      this.typhoonEndTimer = null;
    }

    // Destroy UI Text
    if (this.typhoonText) {
      this.typhoonText.destroy();
      this.typhoonText = null;
    }
    if (this.typhoonSignalSprite) {
      this.typhoonSignalSprite.destroy();
      this.typhoonSignalSprite = null;
    }

    // Destroy Graphics
    if (this.rainGraphics) {
      this.rainGraphics.destroy();
      this.rainGraphics = null;
    }
    this.rainParticles = [];

    // Restore original horizontal velocity of bullets
    const restoreBulletSpeed = (bullet) => {
      if (bullet && bullet.active && bullet.body && bullet.getData('windApplied')) {
        bullet.body.velocity.x -= this.lastWindForce;
        bullet.setData('windApplied', false);
      }
    };

    this.playerBullets.children.iterate(restoreBulletSpeed);
    this.enemyBullets.children.iterate(restoreBulletSpeed);

    if (!silent) {
      // Small banner indicating the warning is lowered
      const lowerLbl = this.add.text(W/2, H/2 - 100, '✔ TYPHOON SIGNAL LOWERED\nWINDS CALMING', {
        font: 'bold 16px Arial Black', color: '#00ffaa', align: 'center',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(150);
      this.tweens.add({
        targets: lowerLbl,
        alpha: 0,
        y: H/2 - 140,
        duration: 1500,
        delay: 1000,
        onComplete: () => lowerLbl.destroy()
      });
    }
  }

  _updateTyphoonRain() {
    if (!this.rainGraphics) return;

    this.rainGraphics.clear();
    // Translucent cyan styling
    this.rainGraphics.lineStyle(1.5, 0x00ffff, 0.45);

    const windDir = this.lastWindForce < 0 ? -1 : 1;

    for (let i = 0; i < this.rainParticles.length; i++) {
      const p = this.rainParticles[i];
      // Rain moves down and in the direction of the wind
      p.x += windDir * p.speed * 0.75;
      p.y += p.speed * 1.5;

      // Wrap-around logic
      if (p.y > H) {
        p.y = -20;
        p.x = Phaser.Math.Between(0, W);
      }
      if (p.x < -20) {
        p.x = W + 20;
      } else if (p.x > W + 20) {
        p.x = -20;
      }

      // Draw the diagonal rain line
      this.rainGraphics.beginPath();
      this.rainGraphics.moveTo(p.x, p.y);
      this.rainGraphics.lineTo(p.x + windDir * 8, p.y + 16);
      this.rainGraphics.strokePath();
    }
  }

  update(time, delta) {
    // If level transition is active, keep player stationary and skip core gameplay logic
    if (this._isLevelCompleting) {
      if (this.player && this.player.active) {
        this.player.setVelocityX(0);
      }
      this.controls.update();
      return;
    }

    if (!this.player.active) return;
    this.controls.update();

    // Update Typhoon rain and bullet physics drift if active
    if (this.typhoonActive) {
      this._updateTyphoonRain();

      const applyBulletWind = (bullet) => {
        if (bullet && bullet.active && bullet.body && !bullet.getData('windApplied')) {
          bullet.body.velocity.x += this.windForce;
          bullet.setData('windApplied', true);
        }
      };

      this.playerBullets.children.iterate(applyBulletWind);
      this.enemyBullets.children.iterate(applyBulletWind);
    }

    // Player movement
    let vx = 0;
    if (this.cursors.left.isDown || this.controls.leftDown) vx = -PLAYER_SPEED;
    else if (this.cursors.right.isDown || this.controls.rightDown) vx = PLAYER_SPEED;
    this.player.setVelocityX(vx);

    // Player shooting
    let fireRate = 420;
    if (this.cargoPowerLevel === 1) fireRate = 300;
    else if (this.cargoPowerLevel >= 2) fireRate = 200;

    let shootConf = getShootConfig(this.powerupLevel);
    if (this.cargoPowerLevel > 0) {
      shootConf.fireRate = fireRate;
    }

    if ((this.keys.SPACE.isDown || this.controls.fireDown) && time > this.lastFired + shootConf.fireRate) {
      this.firePlayerWeapon(shootConf);
      this.lastFired = time;
    }

    // Satellite orbit update
    this._updateSatellites(delta);

    // Entities update
    if (this.formation) this.formation.update(time, this.player);
    if (this.boss) {
      if (this.boss.sprite && this.boss.sprite.active) {
        this.boss.update(time);
        this.events.emit('boss_hp', this.boss.sprite.getData('hp') / this.boss.maxHp);
      } else if (!this._bossDefeated) {
        // Safety net: boss sprite was destroyed outside of onHitBoss (e.g. crash)
        this._bossDefeated = true;
        this.addScore(SCORES.boss);
        this.events.emit('boss_hp', -1);
        // No powerup dropped for crash-kills; just advance after delay
        this.time.delayedCall(1800, () => this.completeLevel());
      }
    }
    if (this.activePowerup) this.activePowerup.update();

    // Bullet cleanup
    // Clean up bullets that leave the screen in ANY direction.
    // Diagonal/angled enemy bullets can exit left or right, so we must
    // check all four edges to prevent memory leaks.
    this.playerBullets.children.iterate(b => {
      if (b && b.active && (b.y < -20 || b.x < -30 || b.x > W + 30)) b.destroy();
    });
    this.enemyBullets.children.iterate(b => {
      if (b && b.active && (b.y > H + 20 || b.y < -30 || b.x < -30 || b.x > W + 30)) b.destroy();
    });
    
    this.bonusPlaneGroup.children.iterate(p => {
      if (p && p.active && ((p.body.velocity.x > 0 && p.x > W + 60) || (p.body.velocity.x < 0 && p.x < -60))) p.destroy();
    });
    this.cargoGroup.children.iterate(c => {
      if (c && c.active && c.y > H + 20) c.destroy();
    });

    // Level complete check
    if (!this.isBossLevel && this.formation && this.formation.group.countActive() === 0) {
      this.completeLevel();
    }
  }

  firePlayerWeapon(conf) {
    const px = this.player.x;
    const py = this.player.y - 20;

    if (conf.mega) {
      const b = this.playerBullets.create(px, py, 'bullet_mega');
      b.setVelocityY(-BULLET_SPD); b.setData('dmg', 3); b.setData('pierce', true);
      SM.mega();
    } else if (conf.laser) {
      const b = this.playerBullets.create(px, py, 'bullet_laser');
      b.setVelocityY(-BULLET_SPD * 1.5); b.setData('dmg', 2); b.setData('pierce', true);
      SM.laser();
    } else if (conf.spread) {
      [-0.15, 0, 0.15].forEach(vx => {
        const b = this.playerBullets.create(px, py, 'bullet_spread');
        b.setVelocity(vx * BULLET_SPD, -BULLET_SPD); b.setData('dmg', 1);
      });
      SM.spreadShoot();
    } else if (conf.doubleBarrel) {
      let b1 = this.playerBullets.create(px - 8, py, 'bullet_player');
      let b2 = this.playerBullets.create(px + 8, py, 'bullet_player');
      b1.setVelocityY(-BULLET_SPD); b2.setVelocityY(-BULLET_SPD);
      b1.setData('dmg', 1); b2.setData('dmg', 1);
      SM.shoot();
    } else if (this.cargoPowerLevel >= 2) {
      // Tier 2: Triple Barrel (cargo buff, no permanent weapon upgrade active)
      const b0 = this.playerBullets.create(px, py, 'bullet_player');
      b0.setVelocityY(-BULLET_SPD); b0.setData('dmg', 1);
      const b1 = this.playerBullets.create(px, py, 'bullet_player');
      this.physics.velocityFromAngle(-75, BULLET_SPD, b1.body.velocity);
      b1.setData('dmg', 1);
      const b2 = this.playerBullets.create(px, py, 'bullet_player');
      this.physics.velocityFromAngle(-105, BULLET_SPD, b2.body.velocity);
      b2.setData('dmg', 1);
      SM.shoot();
    } else if (this.cargoPowerLevel >= 1) {
      // Tier 1: Double Barrel (cargo buff, no permanent weapon upgrade active)
      let b1 = this.playerBullets.create(px - 8, py, 'bullet_player');
      let b2 = this.playerBullets.create(px + 8, py, 'bullet_player');
      b1.setVelocityY(-BULLET_SPD); b2.setVelocityY(-BULLET_SPD);
      b1.setData('dmg', 1); b2.setData('dmg', 1);
      SM.shoot();
    } else {
      // Basic shot
      const b = this.playerBullets.create(px, py, 'bullet_player');
      b.setVelocityY(-BULLET_SPD); b.setData('dmg', 1);
      SM.shoot();
    }

    // Missiles run in parallel if unlocked
    if (conf.missiles) {
      const m1 = this.playerBullets.create(px - 15, py, 'bullet_missile');
      const m2 = this.playerBullets.create(px + 15, py, 'bullet_missile');
      m1.setVelocity(-100, -BULLET_SPD*0.8); m1.setData('dmg', 1); m1.setData('homing', true);
      m2.setVelocity(100, -BULLET_SPD*0.8);  m2.setData('dmg', 1); m2.setData('homing', true);
      
      this.tweens.add({ targets: [m1,m2], 'body.velocity.x': 0, duration: 400 });
      SM.missile();
    }
  }

  fireEnemyBullet(x, y, vxMult=0) {
    const b = this.enemyBullets.create(x, y, 'bullet_enemy');
    if (!b || !b.body) return;
    const speedMult = Math.min(1.4, 1 + Math.floor((this.level - 1) / 15) * 0.05);
    const curSpd = EBULLET_SPD * speedMult;
    b.setVelocity(vxMult * curSpd, curSpd);
  }

  // ── Targeted vector shot (Behavior 1: Hunter) ─────────────────────────
  // Uses physics.moveTo so Arcade Physics calculates the angle automatically.
  fireEnemyBulletToward(x, y, targetX, targetY) {
    const b = this.enemyBullets.create(x, y, 'bullet_enemy');
    if (!b || !b.body) return;
    const speedMult = Math.min(1.4, 1 + Math.floor((this.level - 1) / 15) * 0.05);
    const curSpd = EBULLET_SPD * speedMult;
    this.physics.moveTo(b, targetX, targetY, curSpd * 1.05);
  }

  // ── Diagonal corner barrage (Behavior 2) ─────────────────────────────
  // Uses physics.velocityFromAngle with Phaser's angle convention:
  //   0° = right, 90° = down, 180° = left, 270° = up
  // Right column: 60° → down-right (blankets right corner)
  // Left  column: 120° → down-left (blankets left corner)
  fireEnemyBulletAngled(x, y, angleDeg) {
    const b = this.enemyBullets.create(x, y, 'bullet_enemy');
    if (!b || !b.body) return;
    const speedMult = Math.min(1.4, 1 + Math.floor((this.level - 1) / 15) * 0.05);
    const curSpd = EBULLET_SPD * speedMult;
    this.physics.velocityFromAngle(angleDeg, curSpd * 1.05, b.body.velocity);
  }

  // ── Anti-camping fast tracking shot (Behavior 3) ─────────────────────
  // 1.35× normal speed — punishes a player who camps the screen corners.
  fireEnemyBulletFast(x, y, targetX, targetY) {
    const b = this.enemyBullets.create(x, y, 'bullet_enemy');
    if (!b || !b.body) return;
    const speedMult = Math.min(1.4, 1 + Math.floor((this.level - 1) / 15) * 0.05);
    const curSpd = EBULLET_SPD * speedMult;
    this.physics.moveTo(b, targetX, targetY, curSpd * 1.35);
  }

  onHitEnemy(bullet, enemy) {
    if (!bullet.active || !bullet.body || !bullet.body.enable) return;

    const dmg = bullet.getData('dmg') || 1;
    const pierce = bullet.getData('pierce');
    
    // Save coordinates before enemy or bullet gets destroyed
    const ex = enemy.x;
    const ey = enemy.y;
    const bulX = bullet.x;
    const bulY = bullet.y;

    if (!pierce) {
      bullet.body.enable = false;
      bullet.destroy();
    }
    this.spawnExplosion(bulX, bulY, 0);
    
    const destroyedType = this.formation.hitEnemy(enemy, dmg);
    if (destroyedType) {
      this.addScore(SCORES[destroyedType]);
      SM.enemyExplode();
      this.spawnExplosion(ex, ey, 1);
    }
  }

  onHitBoss(obj1, obj2) {
    // FIX: Phaser 3 overlap(group, sprite, cb) calls cb(sprite, groupMember) — args are REVERSED.
    // Explicitly identify which argument is the boss sprite and which is the player bullet
    // by comparing against this.boss.sprite directly.
    if (!this.boss || !this.boss.sprite) return;
    let bullet, bossSprite;
    if (obj1 === this.boss.sprite) {
      bossSprite = obj1; bullet = obj2;
    } else if (obj2 === this.boss.sprite) {
      bossSprite = obj2; bullet = obj1;
    } else {
      return; // neither arg is the current boss sprite — stale overlap, ignore
    }

    // Guard 1: bullet must still be active
    if (!bullet.active || !bullet.body || !bullet.body.enable) return;
    // Guard 2: boss sprite must still be alive
    if (!bossSprite.active) return;
    // Guard 3: boss defeat logic must not have already triggered
    if (this._bossDefeated) return;

    const dmg = bullet.getData('dmg') || 1;
    const pierce = bullet.getData('pierce');

    // Debounce pierce bullets: each pierce bullet may only deal damage once every 80ms
    if (pierce) {
      const now = Date.now();
      const lastHit = bullet.getData('_lastBossHit') || 0;
      if (now - lastHit < 80) return;
      bullet.setData('_lastBossHit', now);
    }

    const bx = bossSprite.x;
    const by = bossSprite.y;
    const bulX = bullet.x;
    const bulY = bullet.y;

    if (!pierce) {
      bullet.body.enable = false;
      bullet.destroy();
    }
    this.spawnExplosion(bulX, Math.max(bulY, by + bossSprite.height / 2), 1);

    const destroyed = this.boss.hit(dmg);
    if (destroyed && !this._bossDefeated) {
      this._bossDefeated = true;
      this.addScore(SCORES.boss);
      this.events.emit('boss_hp', -1);

      if (this.powerupLevel < 6) {
        // Boss defeated — give extra life (or bonus score if already at max 4 lives)
        this.time.delayedCall(1500, () => {
          // Visual fanfare: orange blasts around defeat position
          for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 100, () => {
              const exp = this.add.sprite(bx + Phaser.Math.Between(-40, 40), by + Phaser.Math.Between(-40, 40), 'exp_2');
              exp.setTintFill(0xffaa00);
              this.tweens.add({
                targets: exp, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400,
                onComplete: () => exp.destroy()
              });
            });
          }

          const MAX_LIVES = 4;
          let rewardText, rewardColor;
          if (this.lives < MAX_LIVES) {
            // Grant an extra life
            this.lives++;
            this.registry.set('lives', this.lives);
            this.events.emit('lives', this.lives);
            SM.powerup();
            rewardText = '❤ +1 LIFE';
            rewardColor = '#ff4488';
          } else {
            // Already at max lives — bonus score instead
            this.addScore(5000);
            rewardText = '★ BONUS +5000';
            rewardColor = '#ffdd00';
          }

          // Show reward announcement
          const lbl = this.add.text(bx, by - 20, rewardText, {
            font: 'bold 22px Arial', color: rewardColor,
            stroke: '#000000', strokeThickness: 4
          }).setOrigin(0.5).setDepth(20);
          this.tweens.add({
            targets: lbl, y: by - 80, alpha: 0, duration: 2000,
            onComplete: () => lbl.destroy()
          });

          // Complete the level after the fanfare settles
          this.time.delayedCall(1000, () => this.completeLevel());
        });
      } else {
        this.time.delayedCall(1500, () => this.completeLevel());
      }
    }
  }

  onBulletHitPowerup(obj1, obj2) {
    if (!this.activePowerup || !this.activePowerup.sprite) return;
    
    let bullet, puSprite;
    if (obj1 === this.activePowerup.sprite) {
      puSprite = obj1; bullet = obj2;
    } else if (obj2 === this.activePowerup.sprite) {
      puSprite = obj2; bullet = obj1;
    } else {
      return;
    }

    if (!bullet.active || !bullet.body || !bullet.body.enable) return;
    if (!puSprite.active || !puSprite.body || !puSprite.body.enable) return;

    bullet.body.enable = false;
    bullet.destroy();

    this.onCollectPowerup(this.player, puSprite);
  }

  onCollectPowerup(player, puSprite) {
    if (!this.activePowerup || !puSprite.active || !puSprite.body || !puSprite.body.enable) return;

    // Immediately disable the physics body to prevent multiple overlaps
    puSprite.body.enable = false;

    SM.powerup();
    this.powerupLevel++;
    this.registry.set('powerupLevel', this.powerupLevel);
    
    this.activePowerup.collect(() => {
      this.activePowerup = null;
      this.completeLevel();
    });
  }

  onCrashEnemy(player, enemy) {
    if (this._playerInvincible) return;
    if (!enemy.active) return;

    // Check if the crashed entity is the boss sprite
    if (this.boss && enemy === this.boss.sprite) {
      this.spawnExplosion(player.x, player.y, 2);
      if (!this._bossDefeated) {
        this._bossDefeated = true;
        this.boss.explode();
        this.addScore(SCORES.boss);
        this.events.emit('boss_hp', -1);
        this.time.delayedCall(1800, () => this.completeLevel());
      }
      this.die();
      return;
    }

    // Regular formation enemy crash
    this.spawnExplosion(player.x, player.y, 2);
    enemy.destroy();
    this.die();
  }

  onHitPlayer(player, bullet) {
    if (this._playerInvincible) return;
    if (!bullet.active || !bullet.body || !bullet.body.enable) return;
    bullet.body.enable = false;
    bullet.destroy();
    this.die();
  }

  spawnExplosion(x, y, sizeIdx=0) {
    const exp = this.add.sprite(x, y, `exp_${sizeIdx}`);
    this.tweens.add({
      targets: exp, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 250 + sizeIdx*50,
      onComplete: () => exp.destroy()
    });
  }

  addScore(pts) {
    this.score += pts;
    this.registry.set('score', this.score);
    this.events.emit('score', this.score);
  }

  die() {
    this.player.setActive(false).setVisible(false);
    this.player.body.enable = false;

    // Reset controls input values
    this.controls.leftDown = false;
    this.controls.rightDown = false;
    this.controls.fireDown = false;

    SM.playerHit();
    this.spawnExplosion(this.player.x, this.player.y, 3);
    
    // Death downgrades the Kai Tak cargo level by 1 instead of resetting to 0
    if (this.cargoPowerLevel > 0) {
      this.cargoPowerLevel--;
    }
    // Clean up current active satellites (they will be recreated centered on the new position upon respawning)
    this._destroySatellites();
    if (this.neonInvincTimer) { this.neonInvincTimer.remove(); this.neonInvincTimer = null; }
    if (this._neonTween) { this._neonTween.stop(); this._neonTween = null; }
    this.player.clearTint();
    this._cargoPowerAngle = 0;
    
    // Permanent weapon also drops one tier on death (min 0 = basic shot)
    if (this.powerupLevel > 0) {
      this.powerupLevel--;
      this.registry.set('powerupLevel', this.powerupLevel);
    }
    
    this.lives--;
    this.registry.set('lives', this.lives);
    this.events.emit('lives', this.lives);

    if (this.lives <= 0) {
      SM.gameOver();
      const finalScore = this.score;
      const finalLevel = this.level;
      this.time.delayedCall(1500, () => {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameOverScene', { score: finalScore, level: finalLevel, won: false });
      });
    } else {
      // Respawn
      this.time.delayedCall(1500, () => {
        if (this._isLevelCompleting) return;

        this.player.setPosition(W/2, H - 160);
        this.player.setActive(true).setVisible(true);
        this.player.body.enable = true;
        this._playerInvincible = true;
        
        // Reapply cargo power to recreate satellites / update barrel graphics centered on new spawn
        this._applyCargoPower();

        // invulnerability flicker for 2 seconds (duration:100ms * yoyo:2 = 200ms cycle * 10 repeats = 2000ms)
        this.tweens.add({
          targets: this.player, alpha: 0.2, duration: 100, yoyo: true, repeat: 9,
          onComplete: () => {
            if (this.player && this.player.active) {
              this.player.setAlpha(1);
            }
            this._playerInvincible = false;
          }
        });
      });
    }
  }

  completeLevel() {
    if (this._isLevelCompleting) return;
    this._isLevelCompleting = true;

    if (this.level === 99) {
      const finalScore = this.score;
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('GameOverScene', { score: finalScore, level: 99, won: true });
      return;
    }

    if (this.isBossLevel) {
      // Clear all bullets
      this.playerBullets.clear(true, true);
      this.enemyBullets.clear(true, true);

      // Disable player body
      this.player.body.enable = false;
      this.player.setVelocity(0);

      // Create fullscreen banner overlay
      const backdrop = this.add.graphics();
      backdrop.fillStyle(0x000000, 0.7);
      backdrop.fillRect(0, 0, W, H);
      backdrop.setDepth(100);

      const bannerText = this.add.text(W / 2, H / 2, "BOSS DEFEATED!\nLEVEL TIER CLEARED", {
        font: 'bold 24px Courier New',
        color: '#ffcc00',
        align: 'center',
        stroke: '#ff0055',
        strokeThickness: 6,
        shadow: { blur: 15, color: '#ff0055', fill: true }
      }).setOrigin(0.5).setDepth(101).setAlpha(0);

      // Tween banner text
      this.tweens.add({
        targets: bannerText,
        alpha: 1,
        scale: { start: 0.7, to: 1.0 },
        duration: 400,
        ease: 'Back.Out'
      });

      SM.levelComplete();

      // Delay transition by 2.5 seconds
      this.time.delayedCall(2500, () => {
        backdrop.destroy();
        bannerText.destroy();
        this._finishLevelCompletion();
      });
      return;
    }

    SM.levelComplete();

    // Disable player physics
    this.player.body.enable = false;
    this.player.setVelocityX(0);

    this._finishLevelCompletion();
  }

  _finishLevelCompletion() {
    // Save current state
    this.level++;
    this.registry.set('level', this.level);
    this.registry.set('score', this.score);
    this.registry.set('lives', this.lives);
    this.registry.set('powerupLevel', this.powerupLevel);

    // Start next level in-place (will draw new background and show banner)
    this._startLevel(true);
  }

  shutdown() {
    this.endTyphoon(true);
    // Called by Phaser when the scene is stopped/destroyed.
    // Explicitly kill all pending timers and tweens so nothing fires
    // after GameOverScene is already active.
    this.time.removeAllEvents();
    this.tweens.killAll();
  }
}

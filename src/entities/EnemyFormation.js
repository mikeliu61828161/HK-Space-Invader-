import { W, ENEMY_HP } from '../config/GameConfig.js';
import { FACE_DOWN_ANGLE } from '../config/orientation.js';

// ─── Formation shape builders ────────────────────────────────────────────────
// Each returns an array of {c, r} grid offsets that define which cells are
// occupied. (0,0) is top-left of the bounding box.

function shapeRectangle(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ c, r });
  return cells;
}

function shapeTriangle(cols, rows) {
  // Pyramid: row 0 has 1 enemy centred, each row adds 2 more
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const count = 1 + r * 2;          // 1, 3, 5, 7 …
    const offset = Math.floor((cols - count) / 2);
    for (let c = 0; c < count; c++)
      cells.push({ c: offset + c, r });
  }
  return cells;
}

function shapeDiamond(cols, rows) {
  // Diamond / rhombus: widens to midpoint then narrows
  const cells = [];
  const mid = Math.floor(rows / 2);
  for (let r = 0; r < rows; r++) {
    const half = r <= mid ? r : rows - 1 - r;
    const count = Math.max(1, 1 + half * 2);
    const offset = Math.floor((cols - count) / 2);
    for (let c = 0; c < count; c++)
      cells.push({ c: offset + c, r });
  }
  return cells;
}

function shapeChevron(cols, rows) {
  // V-shape: two diagonal arms pointing down from the tips
  const cells = new Set();
  const arm = Math.floor(cols / 2);
  for (let i = 0; i < rows; i++) {
    // Left arm: starts at (arm-i, i), right arm mirrors
    const lc = arm - i;
    const rc = arm + i;
    if (lc >= 0)       cells.add(`${lc},${i}`);
    if (rc < cols)     cells.add(`${rc},${i}`);
    // Fill a bit towards centre for density
    for (let c = lc + 1; c < rc && c >= 0 && c < cols; c++)
      if (i === rows - 1) cells.add(`${c},${i}`);
  }
  return [...cells].map(k => {
    const [c, r] = k.split(',').map(Number);
    return { c, r };
  });
}

const SHAPE_BUILDERS = [shapeRectangle, shapeTriangle, shapeDiamond, shapeChevron];

export default class EnemyFormation {
  constructor(scene, cols, rows, enemyTypes, speedMult, fireRateMult) {
    this.scene = scene;
    this.group = scene.physics.add.group();
    this.speed = 35 * speedMult;
    this.baseFireInterval = 1800 / fireRateMult;

    this.direction = 1;  // 1 = right, -1 = left

    // ── Pick a random formation shape ─────────────────────────────────────
    // Diamond is excluded when rows < 4 — it only produces 5 enemies from a
    // 3-row grid, which would undercut the minimum count guarantee.
    const availableShapes = rows >= 4
      ? SHAPE_BUILDERS
      : [shapeRectangle, shapeTriangle, shapeChevron];
    const shapeFn = availableShapes[Math.floor(Math.random() * availableShapes.length)];
    let cells = shapeFn(cols, rows);

    // Fallback to rectangle if sparse shapes yield fewer than 6 invaders
    // to guarantee the level isn't too easy, while keeping rectangle size small.
    if (cells.length < 6) {
      cells = shapeRectangle(cols, rows);
    }

    const spacingX = 72;
    const spacingY = 70;
    const startX   = (W - (cols - 1) * spacingX) / 2;
    const startY   = 80;

    // Each source image is ~1024px; scale to ~67px on screen
    const INVADER_SCALE = 0.065;

    let typeIdx = 0;
    for (const { c, r } of cells) {
      const type  = enemyTypes[typeIdx % enemyTypes.length];
      const enemy = this.group.create(startX + c * spacingX, startY + r * spacingY, type);
      enemy.setAngle(FACE_DOWN_ANGLE[type] ?? 180);
      enemy.setScale(INVADER_SCALE);
      // SCREEN blend mode makes pure-black background pixels transparent
      enemy.setBlendMode(Phaser.BlendModes.SCREEN);
      // Update physics body to match scaled display size
      enemy.body.setSize(enemy.width, enemy.height);
      enemy.setData('type', type);
      const baseHp = ENEMY_HP[type] || 1;
      enemy.setData('hp', baseHp + (scene.level * 2));
      typeIdx++;
    }
    this.group.setVelocityX(this.speed);

    // ── Anti-camping state ────────────────────────────────────────────────
    this._campStart   = -1;
    this._campCooldown = false;

    // ── Unpredictable movement state ──────────────────────────────────────
    // 1. Sinusoidal Y-drift: the whole formation bobs up/down on a sine wave
    this._sinePhase     = Math.random() * Math.PI * 2; // random start phase
    this._sineAmp       = 6 + Math.random() * 8;       // 6–14 px amplitude
    this._sineFreq      = 0.0008 + Math.random() * 0.0010; // ~0.8–1.8s period
    this._baseY         = null; // set on first update

    // 2. Random mid-field direction reversal
    this._nextReversal  = scene.time.now + this._randomReversalDelay();
    this._reversalCooldown = false;

    // 3. Dive attack: formation surges downward then retreats
    this._diveActive    = false;
    this._diveDir       = 0;
    this._nextDive      = scene.time.now + this._randomDiveDelay();
  }

  _randomReversalDelay() {
    return 4000 + Math.random() * 5000; // reverse every 4–9 s
  }

  _randomDiveDelay() {
    return 6000 + Math.random() * 8000; // dive every 6–14 s
  }

  // ─────────────────────────────────────────────────────────────────────────
  // update — called every frame by GameScene
  // ─────────────────────────────────────────────────────────────────────────
  update(time, player) {
    if (this.group.countActive() === 0) return;

    const activeEnemies = this.group.getChildren().filter(e => e.active);
    if (activeEnemies.length === 0) return;

    // ── Initialise baseline Y from the topmost enemy (once) ───────────────
    if (this._baseY === null) {
      this._baseY = Math.min(...activeEnemies.map(e => e.y));
    }

    // ── 1. Wall detection & step-down ─────────────────────────────────────
    let hitWall = false;
    for (const e of activeEnemies) {
      if (e.x >= W - 25 && this.direction === 1)  hitWall = true;
      if (e.x <= 25     && this.direction === -1) hitWall = true;
    }
    if (hitWall) {
      this._reverseDirection();
      for (const e of activeEnemies) e.y += 20;
      this._baseY += 20;
      this._reversalCooldown = true;
      this.scene.time.delayedCall(800, () => { this._reversalCooldown = false; });
    }

    // ── 2. Random mid-field reversal ──────────────────────────────────────
    if (!this._reversalCooldown && time > this._nextReversal) {
      this._reverseDirection();
      this._nextReversal = time + this._randomReversalDelay();
      this._reversalCooldown = true;
      this.scene.time.delayedCall(800, () => { this._reversalCooldown = false; });
    }

    // ── 3. Sinusoidal Y-drift ─────────────────────────────────────────────
    // Move each enemy to (baseY + rowOffset) + sineWave
    this._sinePhase += this._sineFreq * 16; // assume ~60 fps (16ms)
    const sineDelta = Math.sin(this._sinePhase) * this._sineAmp;

    // ── 4. Dive attack ────────────────────────────────────────────────────
    if (!this._diveActive && time > this._nextDive) {
      this._diveActive = true;
      this._diveDir    = 1;  // surge downward
      // After 1.2s pull back up
      this.scene.time.delayedCall(1200, () => { this._diveDir = -1; });
      // After 2.4s end the dive
      this.scene.time.delayedCall(2400, () => {
        this._diveActive = false;
        this._diveDir    = 0;
        this._nextDive   = this.scene.time.now + this._randomDiveDelay();
      });
    }

    const diveY = this._diveActive ? this._diveDir * 1.8 : 0; // px per frame

    // Apply sine + dive Y offset
    for (const e of activeEnemies) {
      e.y += diveY;
    }
    // Nudge baseY during dive so sine is relative to current position
    this._baseY += diveY;

    // ── Anti-camping check ────────────────────────────────────────────────
    if (player && player.active) {
      this._checkAntiCamping(time, player, activeEnemies);
    }

    // ── Random firing (sub-linear scaling + max 6 enemy bullets on screen) ──
    const currentEnemyBullets = this.scene.enemyBullets ? this.scene.enemyBullets.countActive(true) : 0;
    const effectiveEnemies = Math.min(8, Math.sqrt(activeEnemies.length) * 1.8);
    const fireChance = (1000 / this.baseFireInterval) * (1 / 60) * effectiveEnemies * 0.45;
    if (currentEnemyBullets < 6 && Math.random() < fireChance) {
      this._selectAndFire(activeEnemies, player);
    }
  }

  _reverseDirection() {
    this.direction *= -1;
    this.group.setVelocityX(this.speed * this.direction);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // _getFrontRow — bottommost enemy per column
  // ─────────────────────────────────────────────────────────────────────────
  _getFrontRow(activeEnemies) {
    const sorted  = [...activeEnemies].sort((a, b) => a.x - b.x);
    const columns = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      const lastCol = columns[columns.length - 1];
      if (sorted[i].x - lastCol[lastCol.length - 1].x < 24) {
        lastCol.push(sorted[i]);
      } else {
        columns.push([sorted[i]]);
      }
    }
    return columns.map(col => col.reduce((max, e) => (e.y > max.y ? e : max)));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // _selectAndFire — three shot types
  // ─────────────────────────────────────────────────────────────────────────
  _selectAndFire(activeEnemies, player) {
    const sorted          = [...activeEnemies].sort((a, b) => a.x - b.x);
    const leftX           = sorted[0].x;
    const rightX          = sorted[sorted.length - 1].x;
    const leftColEnemies  = activeEnemies.filter(e => Math.abs(e.x - leftX)  < 24);
    const rightColEnemies = activeEnemies.filter(e => Math.abs(e.x - rightX) < 24);
    const frontRow        = this._getFrontRow(activeEnemies);

    const r = Math.random();

    if (r < 0.35 && frontRow.length > 0 && player && player.active) {
      const shooter = frontRow[Math.floor(Math.random() * frontRow.length)];
      this.scene.fireEnemyBulletToward(shooter.x, shooter.y + 15, player.x, player.y);

    } else if (r < 0.55) {
      const useLeft = r < 0.45;
      if (useLeft && leftColEnemies.length > 0) {
        const shooter = leftColEnemies[Math.floor(Math.random() * leftColEnemies.length)];
        this.scene.fireEnemyBulletAngled(shooter.x, shooter.y + 15, 120);
      } else if (rightColEnemies.length > 0) {
        const shooter = rightColEnemies[Math.floor(Math.random() * rightColEnemies.length)];
        this.scene.fireEnemyBulletAngled(shooter.x, shooter.y + 15, 60);
      } else {
        const shooter = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
        this.scene.fireEnemyBullet(shooter.x, shooter.y + 15, 0);
      }

    } else {
      const shooter = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
      this.scene.fireEnemyBullet(shooter.x, shooter.y + 15, 0);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // _checkAntiCamping
  // ─────────────────────────────────────────────────────────────────────────
  _checkAntiCamping(time, player, activeEnemies) {
    const edgeZone = W * 0.10;
    const inEdge   = player.x < edgeZone || player.x > W - edgeZone;

    if (inEdge) {
      if (this._campStart === -1) this._campStart = time;
      if (!this._campCooldown && (time - this._campStart) >= 2500) {
        const overhead = activeEnemies.filter(e => e.y < player.y);
        if (overhead.length > 0) {
          const nearest = overhead.reduce((best, e) =>
            Math.abs(e.x - player.x) < Math.abs(best.x - player.x) ? e : best
          );
          this.scene.fireEnemyBulletFast(nearest.x, nearest.y + 15, player.x, player.y);
        }
        this._campCooldown = true;
        this._campStart    = time;
        this.scene.time.delayedCall(2500, () => { this._campCooldown = false; });
      }
    } else {
      this._campStart = -1;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // hitEnemy — unchanged
  // ─────────────────────────────────────────────────────────────────────────
  hitEnemy(enemy, damage) {
    const hp = enemy.getData('hp') - damage;
    enemy.setData('hp', hp);

    enemy.setTint(0xff5555);
    this.scene.time.delayedCall(50, () => {
      if (enemy.active) enemy.clearTint();
    });

    if (hp <= 0) {
      const type = enemy.getData('type');
      enemy.destroy();
      this.speed += 2;
      this.group.setVelocityX(this.speed * this.direction);
      return type;
    }
    return null;
  }
}

import Phaser from 'phaser';
import { C } from '../config/GameConfig.js';
import tc8neUrl from '../../assets/icons/tc8ne.gif';
import tc8swUrl from '../../assets/icons/tc8sw.gif';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    this.load.image('tc8ne', tc8neUrl);
    this.load.image('tc8sw', tc8swUrl);

    // Regular Invaders
    this.load.image('invader1', 'assets/invader1.png');
    this.load.image('invader2', 'assets/invader2.png');
    this.load.image('invader3', 'assets/invader3.png');
    this.load.image('invader4', 'assets/invader4.png');
    this.load.image('invader5', 'assets/invader5.png');

    // Bosses
    this.load.image('boss1', 'assets/boss1.png');
    this.load.image('boss2', 'assets/boss2.png');
    this.load.image('boss3', 'assets/boss3.png');
    this.load.image('boss4', 'assets/boss4.png');

    // Preload Hong Kong Stage Backgrounds
    this.load.image('harbour', 'assets/background-harbour.webp');
    this.load.image('peak', 'assets/background-peak.webp');
    this.load.image('tst', 'assets/background-tst.webp');
    this.load.image('buddha', 'assets/background-buddha.webp');
    this.load.image('aberdeen', 'assets/background-aberdeen.webp');
    this.load.image('mongkok', 'assets/background-mongkok.webp');
    this.load.image('repulse', 'assets/background-repulse.webp');
    this.load.image('oceanpark', 'assets/background-oceanpark.webp');
    this.load.image('saikung', 'assets/background-saikung.webp');
    this.load.image('temple', 'assets/background-temple.webp');
    this.load.image('kowloon', 'assets/background-kowloon.webp');
    this.load.image('disneyland', 'assets/background-disneyland.webp');
    this.load.image('westkowloon', 'assets/background-westkowloon.webp');
    this.load.image('sky100', 'assets/background-sky100.webp');
    this.load.image('dawn', 'assets/background-dawn.webp');
  }
  create() {
    // boss1.png has a white background; turn it black so SCREEN blending hides it
    this._blackenWhiteBg('boss1');
    // invader5 is drawn in code (top-down F-35, nose up)
    this._genF35('invader5');
    this._genPlayer();
    this._genBullets();
    this._genPowerups();
    this._genExplosions();
    this._genLifeIcon();
    this._genBonusAssets();
    this._genSatellite();
    this.scene.start('MenuScene');
  }

  /** Draw a detailed top-down F-35 (nose UP) as pixel art; used with SCREEN blend. */
  _genF35(key) {
    const R = 256, S = 1024;
    const lo = document.createElement('canvas');
    lo.width = R; lo.height = R;
    const c = lo.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, R, R);
    c.lineJoin = 'round';

    const path = (pts) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
    };
    const poly = (pts, fill, stroke, lw = 2) => {
      path(pts);
      c.fillStyle = fill; c.fill();
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
    };
    const mir = (pts) => pts.map(([x, y]) => [R - x, y]);
    const both = (pts, fill, stroke, lw) => { poly(pts, fill, stroke, lw); poly(mir(pts), fill, stroke, lw); };
    const line = (x1, y1, x2, y2, col, lw = 1) => {
      c.strokeStyle = col; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    };
    const dot = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    const CY = '#19d3e6', DK = '#0a0e12';

    // engine exhaust glow
    const eg = c.createRadialGradient(128, 234, 2, 128, 234, 34);
    eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.25, '#9ff0ff');
    eg.addColorStop(0.6, 'rgba(40,150,255,0.55)'); eg.addColorStop(1, 'rgba(0,80,255,0)');
    c.fillStyle = eg; c.fillRect(80, 200, 96, 56);

    // horizontal tailplanes
    both([[116, 196], [66, 226], [64, 236], [118, 238]], '#2a343f', CY);
    both([[116, 205], [72, 229], [118, 230]], '#3d4a58');

    // main wings: body, bright leading edge, dark flaps
    both([[113, 98], [26, 186], [26, 208], [111, 200]], '#3a4652', CY);
    both([[113, 98], [26, 186], [30, 188], [115, 104]], '#7389a0');
    both([[110, 186], [30, 204], [27, 208], [111, 200]], '#1f2830');
    // wing panel lines + rivets
    line(100, 128, 42, 190, '#1a2128', 1.2); line(156, 128, 214, 190, '#1a2128', 1.2);
    line(106, 150, 52, 198, '#1a2128', 1.2); line(150, 150, 204, 198, '#1a2128', 1.2);
    [[90, 140], [74, 158], [58, 176], [96, 160], [80, 178]].forEach(([x, y]) => {
      dot(x, y, 0.9, '#8aa0b6'); dot(R - x, y, 0.9, '#8aa0b6');
    });
    // wing pylons / weapon pods with orange tips
    both([[62, 150], [70, 150], [70, 178], [62, 178]], '#1b2229', '#2c3944', 1);
    dot(66, 180, 1.8, '#ff8a2a'); dot(R - 66, 180, 1.8, '#ff8a2a');
    // wingtip nav lights
    dot(27, 200, 2, '#ff2a2a'); dot(R - 27, 200, 2, '#2aff6a');

    // twin canted vertical tails
    both([[112, 170], [98, 214], [108, 228], [119, 190]], '#202830', CY, 1.5);
    line(110, 176, 103, 212, '#4a5a6a', 1);

    // fuselage with horizontal shading
    const fg = c.createLinearGradient(106, 0, 150, 0);
    fg.addColorStop(0, '#2a333d'); fg.addColorStop(0.5, '#66788c'); fg.addColorStop(1, '#2a333d');
    poly([[128, 6], [139, 56], [150, 116], [148, 200], [139, 234], [117, 234], [108, 200], [106, 116], [117, 56]], fg, CY, 2);
    // nose chine lines
    line(128, 12, 117, 60, '#8ea4ba', 1); line(128, 12, 139, 60, '#8ea4ba', 1);
    line(117, 60, 108, 116, '#1a2128', 1); line(139, 60, 148, 116, '#1a2128', 1);

    // air intakes with glow
    both([[106, 98], [118, 94], [119, 142], [106, 148]], DK, CY, 1.5);
    both([[109, 104], [116, 101], [116, 136], [109, 140]], '#06324a');
    both([[111, 106], [114, 105], [114, 132], [111, 134]], '#0f6e8f');

    // spine panels
    poly([[121, 126], [135, 126], [136, 200], [120, 200]], '#2b353f');
    [140, 154, 168, 182].forEach(y => line(121, y, 135, y, '#141a20', 1));
    dot(128, 133, 1.2, '#8ea4ba'); dot(128, 161, 1.2, '#8ea4ba'); dot(128, 189, 1.2, '#8ea4ba');
    // lift-fan door
    c.strokeStyle = '#141a20'; c.lineWidth = 1; c.strokeRect(122, 108, 12, 14);

    // canopy
    const cg = c.createLinearGradient(0, 40, 0, 90);
    cg.addColorStop(0, '#38c8e8'); cg.addColorStop(0.5, '#0e5a78'); cg.addColorStop(1, '#06202e');
    c.beginPath(); c.ellipse(128, 66, 10, 25, 0, 0, Math.PI * 2);
    c.fillStyle = cg; c.fill(); c.strokeStyle = CY; c.lineWidth = 1.5; c.stroke();
    line(128, 42, 128, 90, '#04141c', 1);
    c.beginPath(); c.ellipse(125, 56, 2.5, 10, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(200,250,255,0.6)'; c.fill();
    // EOTS sensor under nose
    dot(128, 98, 1.8, CY);

    // exhaust nozzle
    poly([[119, 220], [137, 220], [134, 236], [122, 236]], '#0d1116', '#ff9a3c', 1.5);
    poly([[123, 226], [133, 226], [131, 234], [125, 234]], '#ffd9a0');

    // upscale with nearest-neighbour for a crisp pixel-art look
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const out = cv.getContext('2d');
    out.imageSmoothingEnabled = false;
    out.drawImage(lo, 0, 0, S, S);

    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, cv);
  }

  /** Flood-fill near-white pixels connected to the image border and make them black. */
  _blackenWhiteBg(key) {
    if (!this.textures.exists(key)) return;
    const img = this.textures.get(key).getSourceImage();
    const w = img.width, h = img.height;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const isWhite = (p) => d[p*4] > 215 && d[p*4+1] > 215 && d[p*4+2] > 215;
    const seen = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
      const p = y * w + x;
      if (!seen[p] && isWhite(p)) { seen[p] = 1; stack.push(p); }
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const p = stack.pop();
      d[p*4] = d[p*4+1] = d[p*4+2] = 0;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
    ctx.putImageData(imgData, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, cv);
  }

  _g() { return this.make.graphics({ x:0, y:0, add:false }); }

  /* ─── J-20 Mighty Dragon (facing UP) ─────────────────────── */
  _genPlayer() {
    const g = this._g();
    g.fillStyle(C.J20_BODY);   g.fillRect(17,4,16,46);
    g.fillStyle(C.J20_WING);
    g.fillTriangle(17,22,0,56,17,56);
    g.fillTriangle(33,22,50,56,33,56);
    g.fillRect(7,16,10,5); g.fillRect(33,16,10,5);
    g.fillStyle(C.J20_COCKPIT); g.fillRect(20,4,10,12);
    g.fillStyle(C.J20_ENGINE);  g.fillRect(19,48,12,8);
    g.fillStyle(0xffaa44);      g.fillRect(21,50,8,6);
    g.fillStyle(0x3a3a3a); g.fillRect(18,18,5,5); g.fillRect(27,18,5,5);
    g.fillStyle(C.J20_STAR); g.fillRect(4,40,10,10); g.fillRect(7,37,4,16);
    g.fillStyle(C.J20_STRIPE); g.fillRect(17,40,16,3);
    g.generateTexture('j20',50,60); g.destroy();
  }


  _genBullets() {
    let g;
    g=this._g(); g.fillStyle(C.BULLET_GREEN); g.fillRect(1,0,4,20); g.fillStyle(0xaaffcc); g.fillRect(2,0,2,8); g.generateTexture('bullet_player',6,20); g.destroy();
    g=this._g(); g.fillStyle(C.BULLET_RED); g.fillRect(1,0,4,14); g.generateTexture('bullet_enemy',6,14); g.destroy();
    g=this._g(); g.fillStyle(C.BULLET_BLUE); g.fillRect(1,0,3,14); g.generateTexture('bullet_spread',5,14); g.destroy();
    g=this._g(); g.fillStyle(C.BULLET_LASER); g.fillRect(0,0,8,36); g.fillStyle(0xff88bb); g.fillRect(2,0,4,36); g.generateTexture('bullet_laser',8,36); g.destroy();
    g=this._g(); g.fillStyle(C.BULLET_ORANGE); g.fillTriangle(4,0,0,8,8,8); g.fillRect(2,8,4,12); g.generateTexture('bullet_missile',8,20); g.destroy();
    g=this._g(); g.fillStyle(C.BULLET_GOLD); g.fillCircle(10,10,10); g.fillStyle(0xffffff); g.fillCircle(10,10,4); g.generateTexture('bullet_mega',20,20); g.destroy();
  }

  _genPowerups() {
    const cols=C.PU;
    for(let i=0;i<6;i++){
      const g=this._g();
      g.fillStyle(cols[i]); g.fillRect(2,2,28,28);
      g.fillStyle(0xffffff,0.35); g.fillRect(2,2,28,7);
      g.fillStyle(0x000000,0.25); g.fillRect(2,23,28,7);
      g.fillStyle(cols[i]); g.fillCircle(16,0,5);
      g.fillStyle(0xffffff,0.4); g.fillCircle(16,0,3);
      g.generateTexture('powerup_'+(i+1),32,32); g.destroy();
    }
  }

  _genExplosions() {
    [[14,1.0],[26,0.9],[40,0.7],[54,0.45]].forEach(([sz,a],i)=>{
      const g=this._g(); const c=sz/2;
      g.fillStyle(0xffee00,a); g.fillRect(c-sz*.38,c-sz*.38,sz*.76,sz*.76);
      g.fillStyle(0xff6600,a); g.fillRect(c-sz*.22,c-sz*.48,sz*.44,sz*.12);
      g.fillRect(c-sz*.48,c-sz*.22,sz*.12,sz*.44);
      g.fillRect(c+sz*.28,c-sz*.22,sz*.20,sz*.44);
      g.fillStyle(0xff2200,a*.8); g.fillRect(c-sz*.16,c-sz*.16,sz*.32,sz*.32);
      g.generateTexture('exp_'+i,sz,sz); g.destroy();
    });
  }

  _genLifeIcon() {
    const g=this._g();
    g.fillStyle(0xff2222);
    g.fillRect(4,2,6,6); g.fillRect(12,2,6,6);
    g.fillRect(2,6,18,6); g.fillRect(4,10,14,6);
    g.fillRect(6,14,10,4); g.fillRect(9,16,4,4);
    g.generateTexture('icon_life',22,22); g.destroy();
  }

  _genBonusAssets() {
    let g = this._g();
    // Passenger Jet (facing left, 60x20)
    g.fillStyle(0xffffff); // White fuselage
    g.fillRect(10, 6, 40, 8); 
    g.fillTriangle(10, 6, 10, 14, 0, 10); // Nose
    g.fillStyle(0x0088ff); // Blue stripe
    g.fillRect(10, 10, 40, 2);
    // Wings
    g.fillStyle(0xdddddd);
    g.fillTriangle(25, 6, 40, 6, 45, 0); // Top wing
    g.fillTriangle(25, 14, 40, 14, 45, 20); // Bottom wing
    // Tail
    g.fillTriangle(45, 6, 50, 6, 55, 0); 
    g.generateTexture('bonus_plane', 60, 20);
    g.destroy();

    // Cargo Container with Parachute (30x44)
    g = this._g();
    // --- Parachute canopy (semicircle, top 20px) ---
    // Alternate coloured panels on the dome
    const cx = 15, cy = 20, pr = 14;
    const panelColors = [0xff4444, 0xffffff, 0xff4444, 0xffffff, 0xff4444, 0xffffff];
    for (let i = 0; i < 6; i++) {
      const startA = Math.PI + (i / 6) * Math.PI;
      const endA   = Math.PI + ((i + 1) / 6) * Math.PI;
      g.fillStyle(panelColors[i]);
      g.slice(cx, cy, pr, startA, endA, false);
      g.fillPath();
    }
    // Canopy outline / rim
    g.lineStyle(1, 0x888888, 1);
    g.beginPath();
    g.arc(cx, cy, pr, Math.PI, 0);
    g.strokePath();
    // --- Parachute strings (4 lines from canopy edge down to box) ---
    g.lineStyle(1, 0xdddddd, 0.9);
    // left string
    g.beginPath(); g.moveTo(cx - pr, cy); g.lineTo(cx - 6, 32); g.strokePath();
    // centre-left string
    g.beginPath(); g.moveTo(cx - pr / 2, cy - 2); g.lineTo(cx - 2, 32); g.strokePath();
    // centre-right string
    g.beginPath(); g.moveTo(cx + pr / 2, cy - 2); g.lineTo(cx + 2, 32); g.strokePath();
    // right string
    g.beginPath(); g.moveTo(cx + pr, cy); g.lineTo(cx + 6, 32); g.strokePath();
    // --- Cargo box (bottom 12px) ---
    g.fillStyle(0x00aa44); g.fillRect(3, 32, 24, 12);
    g.fillStyle(0x008833);
    for (let i = 5; i < 27; i += 4) g.fillRect(i, 32, 2, 12);
    g.fillStyle(0xffffff); g.fillRect(7, 36, 16, 4); // label
    g.generateTexture('cargo_container', 30, 44);
    g.destroy();
  }

  _genSatellite() {
    // 16×16 pixel satellite drone
    const g = this._g();
    // Central core
    g.fillStyle(0x00ffff); g.fillRect(6, 6, 4, 4);
    // Solar panels
    g.fillStyle(0x0066aa); g.fillRect(0, 7, 5, 2);
    g.fillStyle(0x0066aa); g.fillRect(11, 7, 5, 2);
    // Panel cells
    g.fillStyle(0x44aaff,0.6); g.fillRect(1,7,1,2); g.fillRect(3,7,1,2);
    g.fillStyle(0x44aaff,0.6); g.fillRect(12,7,1,2); g.fillRect(14,7,1,2);
    // Antenna
    g.fillStyle(0xffffff); g.fillRect(7, 2, 2, 4);
    g.fillCircle(8, 2, 2);
    // Glow dot
    g.fillStyle(0xffffff); g.fillRect(7, 7, 2, 2);
    g.generateTexture('satellite_drone', 16, 16);
    g.destroy();
  }
}

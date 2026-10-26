/**
 * SoundManager — Web Audio API procedural sound effects.
 * Call SoundManager.init() once after first user gesture.
 */
const SM = {
  ctx: null,
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  _play(freq, type, dur, vol=0.3, freqEnd=null) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd) o.frequency.linearRampToValueAtTime(freqEnd, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },
  _noise(dur, vol=0.15) {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf; src.connect(g); g.connect(this.ctx.destination);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.start(); src.stop(this.ctx.currentTime + dur);
  },
  shoot()        { this._play(880, 'square', 0.08, 0.18, 1200); },
  spreadShoot()  { this._play(660, 'square', 0.08, 0.15, 900); },
  laser()        { this._play(1400,'sawtooth',0.12,0.2, 800); },
  missile()      { this._play(300, 'sawtooth',0.15,0.2, 600); },
  mega()         { this._play(200, 'square', 0.18, 0.3, 100); this._noise(0.18, 0.2); },
  enemyExplode() { this._noise(0.18, 0.22); this._play(180,'sawtooth',0.15,0.15,80); },
  bossExplode()  { this._noise(0.4, 0.35);  this._play(100,'sawtooth',0.4, 0.25,40); },
  playerHit()    { this._play(160,'square',0.2,0.3,80);  this._noise(0.1,0.12); },
  powerup()      {
    [440,554,659,880].forEach((f,i)=>{
      setTimeout(()=>this._play(f,'sine',0.15,0.25),i*80);
    });
  },
  bossAlert()    {
    [220,440,220,440].forEach((f,i)=>{
      setTimeout(()=>this._play(f,'square',0.15,0.2),i*120);
    });
  },
  levelComplete() {
    [523,659,784,1047].forEach((f,i)=>{
      setTimeout(()=>this._play(f,'sine',0.2,0.2),i*90);
    });
  },
  gameOver() {
    [523,440,349,262].forEach((f,i)=>{
      setTimeout(()=>this._play(f,'sawtooth',0.3,0.2),i*120);
    });
  },
  menuClick() { this._play(660,'sine',0.1,0.15); },
};
export default SM;

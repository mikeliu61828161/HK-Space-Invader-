export const POWERUPS = [
  { id:1, name:'DOUBLE BARREL', desc:'Two parallel cannons',       color:0x00ff88 },
  { id:2, name:'RAPID FIRE',    desc:'Fire rate ×2.5',             color:0xffaa00 },
  { id:3, name:'SPREAD SHOT',   desc:'3-way spread bullets',       color:0x44aaff },
  { id:4, name:'LASER BEAM',    desc:'Piercing laser beam',        color:0xff0055 },
  { id:5, name:'HOMING MISSILES',desc:'Side missiles track enemies',color:0xff8800 },
  { id:6, name:'MEGA CANNON',   desc:'Wide area explosive rounds', color:0xffd700 },
];
export function getShootConfig(pl){ // pl = powerup level 0-6
  return {
    fireRate:    pl>=2 ? 200 : 420,
    doubleBarrel:pl>=1,
    spread:      pl>=3,
    laser:       pl>=4,
    missiles:    pl>=5,
    mega:        pl>=6,
  };
}

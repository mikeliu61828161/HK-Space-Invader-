import { ENEMY_HP } from './GameConfig.js';

function pool(lvl){
  if(lvl<=10)  return ['invader1'];
  if(lvl<=20)  return ['invader1','invader2'];
  if(lvl<=30)  return ['invader1','invader2','invader3'];
  if(lvl<=50)  return ['invader2','invader3','invader4'];
  if(lvl<=70)  return ['invader3','invader4','invader5'];
  return ['invader4','invader5'];
}
function bossType(lvl){
  if(lvl===99) return 'boss4';
  const tier = Math.floor(lvl / 10);
  if(tier % 3 === 1) return 'boss1';
  if(tier % 3 === 2) return 'boss2';
  return 'boss3';
}
export function getLevelConfig(lvl){
  const isBoss = lvl%10===0 || lvl===99;
  const speedMult    = 1+(lvl-1)*0.015;
  const fireRateMult = 1+(lvl-1)*0.008;
  if(isBoss) return { isBoss:true, bossType:bossType(lvl), bossHp:20+lvl*2, speedMult, fireRateMult };
  // With 72px spacing on a 390px screen, max safe cols = 5
  const cols = Math.min(4 + Math.floor(lvl / 10), 5);
  const rows = Math.min(2 + Math.floor(lvl / 12), 5);
  const p = pool(lvl);
  const enemyTypes = [];
  for(let r=0;r<rows;r++){
    const ti = Math.min(r,p.length-1);
    for(let c=0;c<cols;c++) enemyTypes.push(p[ti]);
  }
  return { isBoss:false, cols, rows, enemyTypes, speedMult, fireRateMult };
}
export function getBgIndex(lvl){ return lvl===99 ? 14 : Math.min(Math.floor((lvl-1)/7),13); }

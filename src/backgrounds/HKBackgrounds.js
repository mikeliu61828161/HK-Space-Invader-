export function drawBackground(scene, bgIndex, w, h) {
  const g = scene.add.graphics({ x: 0, y: 0 });
  const drawSky = (top, bot) => {
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, w, h);
  };
  const drawStars = () => {
    g.fillStyle(0xffffff, 0.6);
    for(let i=0; i<40; i++) g.fillRect(Math.random()*w, Math.random()*(h*0.6), 2, 2);
  };
  const drawMountains = (c) => {
    g.fillStyle(c);
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, h*0.6);
    g.lineTo(w*0.2, h*0.5);
    g.lineTo(w*0.5, h*0.65);
    g.lineTo(w*0.8, h*0.55);
    g.lineTo(w, h*0.4);
    g.lineTo(w, h);
    g.closePath();
    g.fillPath();
  };

  switch(bgIndex) {
    case 0: // Victoria Harbour
      drawSky(0x0a0a2e, 0x1a1a4a); drawStars();
      g.fillStyle(0x000000); g.fillRect(0, h*0.7, w, h*0.3); // city base
      for(let i=0; i<10; i++) g.fillRect(i*40+10, h*0.5+Math.random()*100, 30, h*0.5); // buildings
      g.fillStyle(0xffffaa, 0.4); for(let i=0; i<50; i++) g.fillRect(Math.random()*w, h*0.55+Math.random()*(h*0.4), 4, 4); // windows
      break;
    case 1: // The Peak
      drawSky(0x3a3a4a, 0x5a5a6a);
      drawMountains(0x1a1a2a);
      g.fillStyle(0x445566); g.fillRect(0, h*0.8, w, h*0.2); // haze
      break;
    case 2: // TST
      drawSky(0xffaa44, 0xff4422);
      g.fillStyle(0x2a1a1a); g.fillRect(0, h*0.75, w, h*0.25);
      g.fillStyle(0xffaa44, 0.3); g.fillRect(0, h*0.75, w, 20); // water reflection
      break;
    case 3: // Lantau Buddha
      drawSky(0xff8800, 0xffaa00);
      drawMountains(0x3a1a00);
      g.fillStyle(0x2a1a00); g.fillCircle(w*0.8, h*0.4, 40); // Buddha silhouette
      g.fillRect(w*0.7, h*0.4, 80, 80);
      break;
    case 4: // Aberdeen
      drawSky(0x0088aa, 0x00aaff);
      g.fillStyle(0x004466); g.fillRect(0, h*0.6, w, h*0.4);
      g.fillStyle(0x2a1a1a);
      for(let i=0; i<5; i++) { // junks
        let bx=i*80+20, by=h*0.7+Math.random()*50;
        g.fillRect(bx, by, 60, 20); g.fillTriangle(bx+10, by, bx+30, by-40, bx+50, by);
      }
      break;
    case 5: // Mong Kok
      drawSky(0x050510, 0x151520);
      g.fillStyle(0x111111); g.fillRect(0, 0, w, h); // dense city
      for(let i=0; i<30; i++) {
        g.fillStyle([0xff0088, 0x00ffff, 0xffff00][i%3], 0.8);
        g.fillRect(Math.random()*w, Math.random()*h, 10+Math.random()*30, 5+Math.random()*15); // neon
      }
      break;
    case 6: // Repulse Bay
      drawSky(0x00ccff, 0x00ffff);
      g.fillStyle(0xeecc88); g.fillRect(0, h*0.8, w, h*0.2); // beach
      g.fillStyle(0x0088cc); g.fillTriangle(0, h*0.8, w, h*0.8, w, h); // water curve
      break;
    case 7: // Ocean Park
      drawSky(0x44aaff, 0x88ccff);
      drawMountains(0x228822);
      g.lineStyle(4, 0xaa2222); g.strokeCircle(w*0.5, h*0.6, 60); // coaster arc
      break;
    case 8: // Sai Kung
      drawSky(0x00aa88, 0x44ccaa);
      drawMountains(0x116633);
      g.fillStyle(0x222222); for(let i=0; i<8; i++) g.fillRect(Math.random()*w, h*0.7+Math.random()*(h*0.2), 10, 5); // small boats
      break;
    case 9: // Temple Street
      drawSky(0x4a1a2a, 0x2a0a1a);
      g.fillStyle(0x1a0a0a); g.fillRect(0, h*0.4, w, h*0.6);
      g.fillStyle(0xff2222); for(let i=0; i<15; i++) g.fillCircle(w*0.1+i*20, h*0.5, 5); // lanterns
      g.fillStyle(0xffaa00); for(let i=0; i<10; i++) g.fillRect(w*0.1+i*30, h*0.7, 20, 15); // stalls
      break;
    case 10: // Kowloon Walled City Park
      drawSky(0x888899, 0xaabbcc);
      g.fillStyle(0x223322); g.fillRect(0, h*0.5, w, h*0.5); // ground
      g.fillStyle(0x1a1a1a); g.fillRect(w*0.3, h*0.4, w*0.4, h*0.2); // pavilion
      g.fillTriangle(w*0.25, h*0.4, w*0.5, h*0.3, w*0.75, h*0.4); // roof
      break;
    case 11: // Disneyland
      drawSky(0xffaacc, 0xcc88ff);
      g.fillStyle(0x3a2a4a); g.fillRect(w*0.2, h*0.5, w*0.6, h*0.5); // castle base
      g.fillTriangle(w*0.2, h*0.5, w*0.3, h*0.3, w*0.4, h*0.5); // spires
      g.fillTriangle(w*0.4, h*0.5, w*0.5, h*0.2, w*0.6, h*0.5);
      g.fillTriangle(w*0.6, h*0.5, w*0.7, h*0.3, w*0.8, h*0.5);
      g.fillStyle(0xffff00); g.fillCircle(w*0.2, h*0.2, 10); g.fillCircle(w*0.8, h*0.1, 15); // fireworks
      break;
    case 12: // West Kowloon
      drawSky(0x00aaaa, 0x004444);
      g.fillStyle(0x1a2a2a); g.fillRect(0, h*0.7, w, h*0.3); // waterfront
      g.fillStyle(0x0a1a1a); g.fillRect(w*0.1, h*0.5, w*0.8, h*0.2); // M+ museum
      g.fillStyle(0x00ffff); g.fillRect(w*0.1, h*0.6, w*0.8, 10); // screen
      break;
    case 13: // Sky100
      drawSky(0xccddee, 0xaabbcc);
      g.fillStyle(0xffffff, 0.5); g.fillCircle(w*0.3, h*0.6, 50); g.fillCircle(w*0.7, h*0.5, 60); // clouds
      g.fillStyle(0x445566); g.fillRect(w*0.4, h*0.2, w*0.2, h*0.8); // ICC tower
      break;
    case 14: // FINAL Dawn
      drawSky(0xff0044, 0xffaa00);
      g.fillStyle(0x2a0a00); g.fillRect(0, h*0.7, w, h*0.3); // city base
      for(let i=0; i<15; i++) g.fillRect(i*30, h*0.4+Math.random()*150, 25, h*0.6); // buildings
      g.fillStyle(0xffaa00, 0.4); g.fillRect(0, h*0.75, w, h*0.25); // golden water
      break;
    default:
      drawSky(0x000000, 0x222222);
  }
  return g;
}

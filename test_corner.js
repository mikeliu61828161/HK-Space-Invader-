import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Navigating to game...');
  await page.goto('http://localhost:5173/');

  // Wait for Phaser to initialize and GameScene to start
  await page.waitForFunction(() => {
    return window.__PHASER_GAME__ && 
           window.__PHASER_GAME__.scene.getScene('GameScene') &&
           window.__PHASER_GAME__.scene.getScene('GameScene').player;
  }, { timeout: 10000 });

  console.log('Game started. Moving player to the far left corner...');
  
  // Expose a function to listen for bullet events
  await page.exposeFunction('logMessage', (msg) => {
    console.log('[Browser]', msg);
  });

  await page.evaluate(() => {
    const scene = window.__PHASER_GAME__.scene.getScene('GameScene');
    
    // Disable normal player movement and force player to left edge
    scene.player.setX(10);
    scene.controls.update = () => {}; // Disable controls
    
    // Track bullet destructions and creations
    scene.events.on('update', () => {
        // Just keeping player at edge
        scene.player.setX(10);
    });

    const originalCreate = scene.enemyBullets.create;
    scene.enemyBullets.create = function(x, y, key) {
        const bullet = originalCreate.call(this, x, y, key);
        if (bullet && bullet.body) {
            // Check the velocity to determine type
            // Defer slightly to let physics set velocity
            setTimeout(() => {
                if (!bullet || !bullet.body) return;
                const vx = Math.abs(bullet.body.velocity.x);
                const vy = bullet.body.velocity.y;
                if (vx > 50) {
                    window.logMessage(`Angled/Targeted bullet fired at x:${Math.round(x)}, y:${Math.round(y)} with vx:${Math.round(bullet.body.velocity.x)}, vy:${Math.round(vy)}`);
                }
            }, 50);

            const originalDestroy = bullet.destroy;
            bullet.destroy = function(...args) {
                if (this.y > 600 || this.y < 0 || this.x < 0 || this.x > 400) {
                     window.logMessage(`Bullet properly destroyed out of bounds at x:${Math.round(this.x)}, y:${Math.round(this.y)}`);
                }
                return originalDestroy.apply(this, args);
            };
        }
        return bullet;
    };
  });

  console.log('Waiting 5 seconds to observe anti-camping and corner barrage logic...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Test complete. Closing browser.');
  await browser.close();
})();

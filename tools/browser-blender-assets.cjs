async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1200, height: 900 } });
  const game = await context.newPage();
  const errors = [], glbResponses = [];
  game.on('pageerror', error => errors.push(error.message));
  game.on('response', response => {
    if (response.url().includes('/assets/models/')) glbResponses.push({ url: response.url(), status: response.status() });
  });
  try {
    await game.goto('http://localhost:8787/?smoke=1');
    await game.waitForFunction(() => !!window.__game?.renderer);
    await game.evaluate(() => window.__game.L.blenderReady);
    await game.waitForFunction(() => {
      const root = window.__game?.L?.root;
      return root && ['BlackjackTable', 'EuropeanRouletteTable', 'LuxurySlotMachine'].every(name => root.getObjectByName(name));
    });
    const models = await game.evaluate(() => {
      const names = [];
      window.__game.L.root.traverse(node => names.push(node.name));
      return Object.fromEntries(['BlackjackTable', 'EuropeanRouletteTable', 'LuxurySlotMachine'].map(name => [name, names.filter(value => value === name).length]));
    });
    if (models.BlackjackTable !== 3 || models.EuropeanRouletteTable !== 2 || models.LuxurySlotMachine !== 3) throw Error('Unexpected Blender model count: ' + JSON.stringify(models));
    if (glbResponses.length !== 4 || glbResponses.some(response => response.status !== 200)) throw Error('GLB delivery failed: ' + JSON.stringify(glbResponses));
    await game.getByRole('button', { name: 'Explorer en solo ↗' }).click();
    await game.locator('.story-line').waitFor();
    for (let index = 0; index < 12 && !await game.evaluate(() => window.__game.state.started); index += 1) {
      await game.keyboard.press('Enter');
      await game.waitForTimeout(120);
    }
    if (!await game.evaluate(() => window.__game.state.started)) throw Error('Solo game did not start');

    await game.evaluate(() => {
      const { player, camera } = window.__game;
      player.setPosition(70.5, 17.3, Math.PI);
      camera.rotation.x = -0.14;
    });
    await game.waitForTimeout(250);
    await game.screenshot({ path: 'output/playwright/blender-blackjack.png' });

    await game.evaluate(() => {
      const { player, camera } = window.__game;
      player.setPosition(53.375, 17.4, Math.PI);
      camera.rotation.x = -0.14;
    });
    await game.waitForTimeout(250);
    await game.screenshot({ path: 'output/playwright/blender-roulette.png' });
    if (errors.length) throw Error(errors.join(' | '));
    return { models, glbResponses, consoleErrors: errors };
  } finally {
    await context.close();
  }
}

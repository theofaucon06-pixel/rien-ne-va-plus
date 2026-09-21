async (page) => {
  const base = page.url().split('/').slice(0,3).join('/');
  const results = [];
  for (const fail of [false, true]) {
    const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block' });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    if (fail) await context.route('**/assets/models/blackjack-reference-v2.glb', route => route.abort());
    try {
      await game.goto(base + '/?smoke=1');
      await game.waitForFunction(() => !!window.__game?.renderer);
      const status = await game.evaluate(async () => (await window.__game.L.blenderReady).map(r => r.status));
      if (status.filter(s => s === 'rejected').length !== (fail ? 1 : 0)) throw Error('Asset loading failed: ' + status);
      const tables = await game.evaluate(() => ['bj1','bj2','bj3'].map(id => {
        const { L } = window.__game;
        const fallback = L.root.getObjectByName('table-fallback:' + id);
        const seats = L.root.getObjectByName('blackjack-seats:' + id);
        const model = L.blenderModels.find(m => m.name === 'BlackjackTable' && m.position.equals(fallback.position));
        let meshes = 0; model?.traverse(m => { if (m.isMesh) meshes++; });
        return { id, fallback: fallback.visible, seats: seats.children[0].children.length, meshes, scale: model?.scale.toArray() };
      }));
      for (const table of tables) {
        if (table.fallback !== fail || table.seats !== 5) throw Error('Missing fallback or seats: ' + JSON.stringify(table));
        if (!fail && (table.meshes !== 9 || new Set(table.scale).size !== 1)) throw Error('Distorted or incomplete model: ' + JSON.stringify(table));
      }
      await game.getByRole('button', { name: 'Explorer en solo ↗' }).click();
      await game.locator('.story-line').waitFor();
      for (let i=0; i<12 && !await game.evaluate(() => window.__game.state.started); i++) {
        await game.keyboard.press('Enter'); await game.waitForTimeout(120);
      }
      await game.evaluate(() => {
        const { player, camera } = window.__game;
        player.setPosition(70.5,16.5,0); camera.lookAt(70.5,.9,13.125);
      });
      if (!fail) {
        await game.waitForTimeout(4000);
        await game.screenshot({ path: 'output/playwright/blackjack-reference-integrated.png' });
      }
      for (const id of ['bj1','bj2','bj3']) {
        await game.evaluate(id => {
          const { L, state, interactTarget } = window.__game;
          state.chips = 1000;
          interactTarget(L.hits.find(h => h.userData.target?.o?.id === id).userData.target);
        }, id);
        await game.waitForFunction(() => !document.pointerLockElement);
        await game.waitForTimeout(150);
        await game.locator('#g-deal').click();
        if (await game.locator('#g-ins-no').isVisible()) await game.locator('#g-ins-no').click();
        if (await game.locator('#g-stand').isVisible()) await game.locator('#g-stand').click();
        await game.waitForFunction(() => window.__game.state.blackjack.round.phase === 'settled');
        await game.evaluate(() => window.__game.ui.panel.close());
        await game.waitForTimeout(250);
      }
      if (errors.length) throw Error(errors.join(' | '));
      results.push({ fail, tables, completeRounds: 3, errors });
    } finally { await context.close(); }
  }
  return results;
}

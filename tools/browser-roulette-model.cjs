async (page) => {
  const base = page.url().split('/').slice(0, 3).join('/');
  const browser = page.context().browser();
  const results = [];
  for (const fail of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block' });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await context.route('**/assets/models/roulette-reference-v2.glb', async route => {
      await gate;
      if (fail) await route.abort(); else await route.continue();
    });
    let stage = 'startup';
    try {
      await game.goto(base + '/?smoke=1', { waitUntil: 'domcontentloaded' });
      await game.waitForFunction(() => !!window.__game?.renderer);
      const pending = await game.evaluate(() => ['roulette', 'roulette2'].map(id => {
        const fallback = window.__game.L.root.getObjectByName('table-fallback:' + id);
        let meshes = 0; fallback.traverse(node => { if (node.isMesh) meshes++; });
        return { visible: fallback.visible, meshes };
      }));
      if (pending.some(table => !table.visible || !table.meshes)) throw Error('Fallback lost during static merge');
      release();
      const settled = await game.evaluate(async () => (await window.__game.L.blenderReady).map(item => item.status));
      if (settled.filter(status => status === 'rejected').length !== (fail ? 1 : 0)) throw Error('Unexpected asset failures: ' + settled);
      await game.getByRole('button', { name: 'Explorer en solo ↗' }).click();
      await game.locator('.story-line').waitFor();
      for (let i = 0; i < 12 && !await game.evaluate(() => window.__game.state.started); i++) {
        await game.keyboard.press('Enter'); await game.waitForTimeout(120);
      }
      await game.evaluate(() => {
        const { player, camera } = window.__game;
        player.setPosition(53.375, 16.8, 0);
        camera.lookAt(53.375, 0.95, 13.125);
      });
      await game.waitForTimeout(450);
      const tables = await game.evaluate(() => {
        const { L } = window.__game;
        return ['roulette', 'roulette2'].map(id => {
          const fallback = L.root.getObjectByName('table-fallback:' + id);
          const furnishings = L.root.getObjectByName('roulette-furnishings:' + id);
          const model = L.blenderModels.find(node => node.name === 'EuropeanRouletteTable' && node.position.equals(fallback.position));
          let meshes = 0; model?.traverse(node => { if (node.isMesh) meshes++; });
          return { id, fallback: fallback.visible, modelVisible: model?.visible, scale: model?.scale.toArray(), meshes, furnishings: furnishings.visible, furnitureCount: furnishings.children.length };
        });
      });
      for (const table of tables) {
        if (table.fallback !== fail || !table.furnishings || table.furnitureCount !== 4) throw Error('Incorrect replacement: ' + JSON.stringify(table));
        if (!fail && (!table.modelVisible || table.meshes !== 10 || new Set(table.scale).size !== 1)) throw Error('Incorrect model: ' + JSON.stringify(table));
      }
      // Let the room banner disappear naturally before inspecting the table.
      await game.waitForTimeout(4200);
      await game.screenshot({ path: 'output/playwright/roulette-' + (fail ? 'fallback' : 'integrated') + '.png' });
      for (const id of ['roulette', 'roulette2']) {
        stage = 'interact ' + id;
        await game.evaluate(id => {
          const { L, state, interactTarget } = window.__game;
          state.chips = 1000;
          interactTarget(L.hits.find(hit => hit.userData.target?.o?.id === id).userData.target);
        }, id);
        // Give the frame loop time to release pointer lock when the panel opens.
        await game.waitForFunction(() => document.pointerLockElement === null);
        await game.waitForTimeout(150);
        const before = await game.evaluate(() => window.__game.state.roulette.hist.length);
        await game.locator('#g-launch').click();
        stage = 'result ' + id;
        await game.waitForFunction(n => window.__game.state.roulette.hist.length > n, before);
        await game.waitForFunction(() => !document.querySelector('#g-launch')?.disabled);
        await game.evaluate(() => window.__game.ui.panel.close());
        await game.waitForTimeout(250);
      }
      if (errors.length) throw Error(errors.join(' | '));
      results.push({ scenario: fail ? 'failed download' : 'delayed then successful download', tables, errors });
    } catch (error) {
      await game.screenshot({ path: 'output/playwright/roulette-test-error.png' });
      throw Error(stage + ': ' + error.message + ' / ' + errors.join(' | ') + ' / ' + await game.locator('body').innerText());
    } finally { release(); await context.close(); }
  }
  return results;
}

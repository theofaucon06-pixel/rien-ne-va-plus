async (page) => {
  const base=page.url().split('/').slice(0,3).join('/'), results=[];
  for (const fail of [false,true]) {
    const context=await page.context().browser().newContext({viewport:{width:1440,height:960},serviceWorkers:'block'});
    const game=await context.newPage(), errors=[];
    game.on('pageerror',e=>errors.push(e.message));
    if (fail) await context.route('**/assets/models/casino-facade-v1.glb',r=>r.abort());
    try {
      await game.goto(base+'/?smoke=1');
      await game.waitForFunction(()=>!!window.__game?.renderer);
      const loaded=await game.evaluate(async()=>{
        const {L}=window.__game, status=(await L.blenderReady).map(r=>r.status);
        return {status,facade:!!L.dynamic.facade,fallback:L.root.getObjectByName('facade-fallback').visible};
      });
      if (loaded.facade===fail || loaded.fallback!==fail || loaded.status.filter(s=>s==='rejected').length!==(fail?1:0)) throw Error('Invalid facade load: '+JSON.stringify(loaded));
      await game.getByRole('button',{name:'Explorer en solo ↗'}).click();
      await game.locator('.story-line').waitFor();
      for(let i=0;i<12&&!await game.evaluate(()=>window.__game.state.started);i++) {await game.keyboard.press('Enter');await game.waitForTimeout(120);}
      await game.evaluate(()=>{
        const {player,camera,quality}=window.__game;player.setPosition(38,1.9,Math.PI);camera.lookAt(38,2.25,8);quality.set(3,false);
      });
      await game.waitForTimeout(4200);
      if (!fail) {
        if (await game.evaluate(()=>window.__game.L.dynamic.facade.userData.doorOpen)) throw Error('Doors open from too far away');
        await game.screenshot({path:'output/playwright/facade-closed.png'});
        await game.evaluate(()=>window.__game.player.setPosition(38,6.9,Math.PI));
        await game.waitForFunction(()=>window.__game.L.dynamic.facade.userData.doorOpen===true);
        const geometry=await game.evaluate(()=>{
          const {L,player,camera}=window.__game;
          return {cameraY:camera.position.y,centerBlocked:player.blocked(38,7.78),wallBlocked:player.blocked(36,7.7),hinges:['DoorLeft','DoorRight'].map(n=>L.dynamic.facade.getObjectByName(n).rotation.y)};
        });
        if (geometry.centerBlocked||!geometry.wallBlocked||Math.abs(geometry.cameraY-1.78)>.06) throw Error('Door/step collision mismatch: '+JSON.stringify(geometry));
        await game.screenshot({path:'output/playwright/facade-open.png'});
      }
      // Walk using the real movement controller, through the entrance and back.
      await game.evaluate(()=>{const {player}=window.__game;player.setPosition(38,6.9,Math.PI);player.touch=true;player.keys.add('w');});
      await game.waitForFunction(()=>window.__game.camera.position.z>9.2);
      await game.evaluate(()=>window.__game.player.keys.clear());
      const entered=await game.evaluate(()=>window.__game.state.flags.entered);
      if(!entered)throw Error('Walking through entrance did not enter the hall');
      await game.evaluate(()=>{const {player,camera}=window.__game;camera.rotation.set(0,0,0);player.keys.add('w');});
      await game.waitForFunction(()=>window.__game.camera.position.z<6.3);
      await game.evaluate(()=>window.__game.player.keys.clear());
      if (!fail) {
        await game.evaluate(()=>window.__game.player.setPosition(38,2,Math.PI));
        await game.waitForFunction(()=>Math.abs(window.__game.L.dynamic.facade.getObjectByName('DoorLeft').rotation.y)<.03);
        // Opening remains interactable and uses the new door description.
        await game.evaluate(()=>{const {L,interactTarget}=window.__game;interactTarget(L.hits.find(h=>h.userData.target?.o?.type==='entrance').userData.target);});
        await game.getByText('Les portes vitrées s’ouvrent. Dehors, la nuit continue sans toi.').waitFor();
      }
      if(errors.length)throw Error(errors.join(' | '));
      results.push({fail,...loaded,entered,walkedBothDirections:true,errors});
    } catch(error) {
      await game.screenshot({path:'output/playwright/facade-error.png'});
      throw Error(error.message+' / '+errors.join(' | ')+' / '+await game.evaluate(()=>JSON.stringify({position:window.__game?.camera.position,stack:window.__game?.ui.stack})));
    } finally {await context.close();}
  }
  return results;
}

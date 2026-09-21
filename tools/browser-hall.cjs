async (page) => {
  const base=page.url().startsWith('http')?new URL(page.url()).origin:'http://localhost:8787';
  const results=[];
  for(const fail of [false,true]) {
    const context=await page.context().browser().newContext({viewport:{width:1440,height:960},serviceWorkers:'block'});
    const game=await context.newPage(),errors=[];
    game.on('pageerror',e=>errors.push(e.message));
    let release;const pending=new Promise(resolve=>release=resolve);
    await context.route('**/assets/models/casino-hall-v1.glb',async route=>{await pending;return fail?route.abort():route.continue();});
    try {
      await game.goto(base+'/?smoke=1');
      await game.waitForFunction(()=>!!window.__game?.renderer);
      const loading=await game.evaluate(()=>({fallback:window.__game.L.root.getObjectByName('hall-fallback').visible,model:!!window.__game.L.dynamic.hall}));
      if(!loading.fallback||loading.model)throw Error('Hall must retain its original decoration while loading');
      release();
      const loaded=await game.evaluate(async()=>{
        const {L}=window.__game;const statuses=(await L.blenderReady).map(r=>r.status);
        return {statuses,hall:!!L.dynamic.hall,fallback:L.root.getObjectByName('hall-fallback').visible,oldLights:L.lightSpots.filter(l=>l.hallFallback&&l.intensity>0).length};
      });
      if(loaded.hall===fail||loaded.fallback!==fail||loaded.statuses.filter(s=>s==='rejected').length!==(fail?1:0)||loaded.oldLights!==(fail?1:0))throw Error('Invalid hall loading '+JSON.stringify(loaded));
      await game.getByRole('button',{name:'Explorer en solo ↗'}).click();
      await game.locator('.story-line').waitFor();
      for(let i=0;i<12&&!await game.evaluate(()=>window.__game.state.started);i++){await game.keyboard.press('Enter');await game.waitForTimeout(120);}
      await game.evaluate(()=>{const {player,camera,quality}=window.__game;player.setPosition(40,9.1,Math.PI);camera.lookAt(40,1.85,16);quality.set(1,false);});
      await game.waitForTimeout(6000);
      if(!fail){
        await game.screenshot({path:'output/playwright/hall-high.png'});
        const geometry=await game.evaluate(async()=>{
          const THREE=await import('three'),{L,player}=window.__game;
          L.root.updateMatrixWorld(true);
          const paths=[[[40,1.6,17.5],[40,1.6,19.5]],[[35,1.6,13.5],[33,1.6,13.5]],[[45,1.6,13.5],[47,1.6,13.5]],[[38,1.6,9.2],[38,1.6,8.4]]];
          const visualBlocked=paths.map(([a,b])=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),ray=new THREE.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end));return ray.intersectObject(L.dynamic.hall,true).map(hit=>hit.object.name);});
          return {visualBlocked,solids:[[40,13.5],[36.125,12.2],[43.875,12.2],[34.875,9.625]].map(([x,z])=>player.blocked(x,z))};
        });
        if(geometry.visualBlocked.some(h=>h.length)||geometry.solids.some(b=>!b))throw Error('Hall opening or furniture regression: '+JSON.stringify(geometry));
        const before=await game.evaluate(()=>window.__game.L.dynamic.hall.getObjectByName('FortuneRotor').rotation.z);
        await game.waitForTimeout(250);
        if(await game.evaluate(()=>window.__game.L.dynamic.hall.getObjectByName('FortuneRotor').rotation.z)===before)throw Error('Fortune rotor is frozen');
      }
      await game.evaluate(()=>window.__game.quality.set(3,false));
      if(!fail){await game.waitForTimeout(300);await game.screenshot({path:'output/playwright/hall-low.png'});}
      // Cross each original doorway using the actual movement controller.
      for(const [x,z,yaw,axis,target,greater] of [[40,17,Math.PI,'z',19.7,true],[35.2,13.5,Math.PI/2,'x',32.7,false],[44.8,13.5,-Math.PI/2,'x',47.2,true],[38,9.6,0,'z',6.5,false]]) {
        await game.evaluate(({x,z,yaw})=>{const {player}=window.__game;player.keys.clear();player.vel.set(0,0,0);player.setPosition(x,z,yaw);player.touch=true;player.keys.add('w');},{x,z,yaw});
        await game.waitForFunction(({axis,target,greater})=>greater?window.__game.camera.position[axis]>target:window.__game.camera.position[axis]<target,{axis,target,greater},{timeout:15000});
        await game.evaluate(()=>window.__game.player.keys.clear());
      }
      await game.evaluate(()=>{const {player}=window.__game;player.setPosition(38,6.5,Math.PI);player.keys.add('w');});
      await game.waitForFunction(()=>window.__game.camera.position.z>9.1);
      await game.evaluate(()=>{window.__game.player.keys.clear();window.__game.player.touch=false;});
      // Existing gameplay still opens from the retained targets.
      await game.evaluate(()=>{const {L,interactTarget}=window.__game;interactTarget(L.hits.find(h=>h.userData.target?.o?.id==='caisse').userData.target);});
      await game.getByRole('button',{name:'Changer 100 €',exact:true}).click();
      if(await game.evaluate(()=>window.__game.state.chips)!==100)throw Error('Cashier exchange failed');
      await game.evaluate(()=>window.__game.ui.panel.close());
      await game.waitForTimeout(250);
      await game.evaluate(()=>{const {L,interactTarget}=window.__game;interactTarget(L.hits.find(h=>h.userData.target?.o?.id==='wheel').userData.target);});
      await game.waitForFunction(()=>!document.pointerLockElement);
      await game.waitForTimeout(150);
      await game.locator('#g-turn').click();
      await game.waitForFunction(()=>!document.querySelector('#g-turn').disabled,{},{timeout:15000});
      await game.evaluate(()=>window.__game.ui.panel.close());
      await game.waitForTimeout(250);
      await game.evaluate(()=>{const {L,interactTarget}=window.__game;interactTarget(L.hits.find(h=>h.userData.target?.o?.id==='fidelite').userData.target);});
      await game.locator('#dialog').waitFor();
      await game.waitForFunction(()=>!document.pointerLockElement);
      await game.keyboard.press('Enter');
      if(!await game.getByRole('button',{name:/Non merci/}).isVisible())await game.keyboard.press('Enter');
      await game.getByRole('button',{name:/Non merci/}).click();
      await game.evaluate(()=>{const {L,interactTarget}=window.__game;interactTarget(L.hits.find(h=>h.userData.target?.o?.key==='fountain').userData.target);});
      await game.getByText("Des pièces au fond de l'eau.",{exact:false}).waitFor();
      await game.keyboard.press('Enter');
      if(errors.length)throw Error(errors.join(' | '));
      results.push({fail,loading,...loaded,passages:4,cashier:true,wheel:true,loyalty:true,fountain:true,errors});
    } catch(error) {
      await game.screenshot({path:'output/playwright/hall-error.png'});
      throw error;
    } finally {release();await context.close();}
  }
  return results;
}

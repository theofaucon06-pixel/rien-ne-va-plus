async (page) => {
 let stage='init'; const browser=page.context().browser(),errors=[],report=[];
 const desktop=await browser.newContext({viewport:{width:1100,height:760}}),mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const a=await desktop.newPage(),b=await mobile.newPage();for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
 try{
  stage='3D loading';
  await a.goto('http://localhost:8787/?smoke=1');await a.waitForFunction(()=>!!window.__game?.renderer,{},{timeout:30000});
  if(await a.evaluate(()=>document.body.dataset.mode)!=='3d')throw Error('3D fell back unexpectedly');
  stage='3D room';
  await a.getByRole('button',{name:'Entrer entre amis ＋'}).click();await a.getByLabel('Ton pseudo').fill('Camille');await a.getByRole('button',{name:'Créer ou rejoindre →'}).click();await a.waitForFunction(()=>window.__game.experience.net.status==='online');
  const code=await a.locator('.room-code').textContent();
  stage='mobile join';
  await b.goto('http://localhost:8787/classic.html?room='+code);await b.getByLabel('Ton pseudo').fill('Noa');await b.getByRole('button',{name:'Rejoindre le salon',exact:true}).click();await b.waitForFunction(()=>window.__game.experience.net.room?.players.filter(p=>p.online).length===2);
  if(await b.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw Error('Mobile horizontal overflow');
  await b.screenshot({path:'/tmp/rnvp-v2-mobile-salon.png'});
  stage='start both games';
  for(const p of [a,b]){await p.getByRole('button',{name:'Explorer le casino →'}).click();await p.locator('.story-line').waitFor();for(let i=0;i<8&&!await p.evaluate(()=>window.__game.state.started);i++){await p.keyboard.press('Enter');await p.waitForTimeout(300);}await p.waitForFunction(()=>window.__game.state.started);}
  stage='peer avatar';
  await a.waitForFunction(()=>window.__game.peers.avatars.size===1);
  const render=await a.evaluate(()=>window.__game.renderOnce());if(!render.calls)throw Error('No 3D rendering');
  report.push('Un avatar 2D mobile est visible dans le casino 3D');
  // Move using the actual touch pad, then check the other browser receives the position.
  stage='touch movement';
  const before=await b.evaluate(()=>window.__game.state.player.x);await b.locator('[data-k="ArrowRight"]').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',bubbles:true});await b.waitForTimeout(350);await b.locator('[data-k="ArrowRight"]').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',bubbles:true});
  await a.waitForFunction(before=>window.__game.state.remotePlayers[0]?.targetX>before,before);report.push('Déplacement tactile transmis en 3D');
  // Resume camera must use the saved position, not overwrite it at the spawn.
  stage='save reload';
  await a.evaluate(()=>{const g=window.__game;g.tp(1670,480);g.camera.rotation.y=.8;g.state.money=271;});await a.waitForTimeout(300);await a.reload();await a.waitForFunction(()=>!!window.__game?.renderer);
  stage='resume';
  await a.getByRole('button',{name:'Continuer la soirée',exact:true}).click();await a.waitForFunction(()=>window.__game.state.started);
  const resumed=await a.evaluate(()=>({x:window.__game.state.player.x,y:window.__game.state.player.y,money:window.__game.state.money,yaw:window.__game.camera.rotation.y}));
  if(Math.abs(resumed.x-1670)>3||Math.abs(resumed.y-480)>3||resumed.money!==271||Math.abs(resumed.yaw-.8)>.02)throw Error('3D save not restored: '+JSON.stringify(resumed));
  stage='map';
  // The resumed 3D game captures the pointer: open the map with its keyboard shortcut.
  await a.keyboard.press('p');await a.locator('.map-svg').waitFor();await a.waitForFunction(()=>!document.pointerLockElement);await a.screenshot({path:'/tmp/rnvp-v2-map.png'});await a.getByRole('button',{name:'Fermer',exact:true}).click();
  await a.screenshot({path:'/tmp/rnvp-v2-3d.png'});report.push('Reprise 3D : position, direction et solde restaurés');
  stage='mobile screenshot';
  await b.goto('http://localhost:8787/classic.html');await b.waitForFunction(()=>!!window.__game);await b.screenshot({path:'/tmp/rnvp-v2-mobile-home.png',fullPage:true});
  if(errors.length)throw Error(errors.join('\n'));return {passed:report,render,consoleErrors:errors};
 }catch(e){const states=await Promise.all([a,b].map(p=>p.evaluate(()=>({url:location.href,started:window.__game?.state.started,top:window.__game?.ui.top(),pos:window.__game?.state.player,net:window.__game?.experience.net.status,peers:window.__game?.state.remotePlayers})).catch(()=>null)));throw Error(stage+': '+e.message+' '+JSON.stringify(states));}finally{await desktop.close();await mobile.close();}
}

// playwright-cli run-code --filename tools/browser-check.cjs (local server on 8787).
async (page) => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 let stage='start'; const errors=[],report=[];page.on('pageerror',e=>errors.push(e.message));
 const context=await page.context().browser().newContext({viewport:{width:1100,height:800}}),peer=await context.newPage();peer.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:8787/classic.html?cloud=1');await page.waitForFunction(()=>!!window.__game?.experience);
  await page.evaluate(async()=>{await window.__game.experience.net.leave();localStorage.removeItem('rnvp-save');});
  await page.reload();await page.waitForFunction(()=>!!window.__game?.experience);
  if(!await page.evaluate(()=>window.__game.experience.net.cloud))throw Error('Cloud transport not active');
  stage='join host';
  await page.getByRole('button',{name:'Entrer entre amis ＋'}).click();await page.getByLabel('Ton pseudo').fill('Alice');
  await page.getByRole('button',{name:'Créer ou rejoindre →'}).click();await page.waitForFunction(()=>window.__game.experience.net.status==='online');
  const code=await page.locator('.room-code').textContent();
  stage='join peer';
  await peer.goto('http://localhost:8787/classic.html?cloud=1&room='+code);await peer.getByLabel('Ton pseudo').fill('Bob');await peer.getByRole('button',{name:'Rejoindre le salon',exact:true}).click();
  for(const p of [page,peer])await p.waitForFunction(()=>window.__game.experience.net.room?.players.filter(p=>p.online).length===2);
  report.push('Deux navigateurs dans le même salon privé');
  stage='roulette';
  for(const p of [page,peer])await p.getByRole('button',{name:'Roulette commune',exact:true}).click();
  await page.getByRole('button',{name:'Rouge',exact:true}).click();await peer.getByRole('button',{name:'Noir',exact:true}).click();await page.getByRole('button',{name:'Lancer le tirage commun',exact:true}).click();
  await peer.waitForFunction(()=>window.__game.experience.net.room.table.result!==null);
  assert(await page.locator('.roulette-number').textContent()===await peer.locator('.roulette-number').textContent(),'Different roulette results');report.push('Même tirage commun dans les deux interfaces');
  stage='quiz';
  for(const p of [page,peer])await p.getByRole('button',{name:'Quiz collectif',exact:true}).click();
  await page.getByRole('button',{name:'Lancer le quiz collectif',exact:true}).click();await peer.locator('.quiz-answers button').first().waitFor();
  await page.locator('.quiz-answers button').first().click();await peer.locator('.quiz-answers button').nth(1).click();
  await page.locator('.quiz-feedback').waitFor();await peer.locator('.quiz-feedback').waitFor();
  assert(await page.locator('.quiz-feedback p').textContent()===await peer.locator('.quiz-feedback p').textContent(),'Different corrections');
  await page.getByRole('button',{name:'Question suivante →'}).click();await peer.waitForFunction(()=>window.__game.experience.net.room.quiz.index===1);report.push('Quiz synchronisé, réponses et correction');
  stage='start game';
  await page.getByRole('button',{name:'Explorer ensemble',exact:true}).click();await page.getByRole('button',{name:'Explorer le casino →'}).click();
  await page.locator('.story-line').waitFor();for(let i=0;i<8&&!await page.evaluate(()=>window.__game.state.started);i++){await page.keyboard.press('Enter');await page.waitForTimeout(300);}await page.waitForFunction(()=>window.__game.state.started);
  stage='movement';
  await page.evaluate(()=>{window.__game.tp(1620,480);window.__game.state.revealed.add('avantage');});
  await peer.waitForFunction(()=>{const p=window.__game.experience.net.room.players.find(p=>p.name==='Alice');return p&&Math.abs(p.x-1620)<3&&p.discoveries.includes('avantage');});
  assert(await peer.evaluate(()=>window.__game.state.remotePlayers.some(p=>p.name==='Alice')),'Missing peer');report.push('Déplacements et découvertes partagés');
  stage='map';
  await page.getByRole('button',{name:'Carte',exact:true}).click();await page.locator('.map-svg').waitFor();await page.getByRole('button',{name:'Le restaurant',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#mission-guide').textContent.includes('restaurant'));report.push('Carte et guidage');
  stage='save';
  await page.evaluate(()=>{const s=window.__game.state;s.money=321;s.debt=123;s.revealed.add('memoire');});
  await page.goto('http://localhost:8787/classic.html?cloud=1');await page.waitForFunction(()=>!!window.__game);await page.waitForTimeout(16100);
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('rnvp-save')));assert(save.money===321&&save.debt===123&&save.revealed.includes('memoire'),'Save overwritten');report.push('Sauvegarde conservée après 16 secondes à l’accueil');
  assert(errors.length===0,errors.join('\n'));return {passed:report,consoleErrors:errors};
 }catch(e){throw Error(stage+': '+e.message+' '+JSON.stringify(await page.evaluate(()=>({top:window.__game?.ui.top(),started:window.__game?.state.started,dialog:document.querySelector('dialog')?.open,net:window.__game?.experience.net.status}))));}finally{for(const p of [page,peer])await p.evaluate(()=>window.__game?.experience.net.leave()).catch(()=>{});await context.close();}
}

async (page) => {
 const context=await page.context().browser().newContext(),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const cards=async()=>{await p.locator('.story-line').waitFor();for(let i=0;i<12&&!await p.evaluate(()=>window.__game.state.started);i++){await p.keyboard.press('Enter');await p.waitForTimeout(150);}await p.waitForFunction(()=>window.__game.state.started);};
 const end=async()=>{await p.evaluate(async()=>{const g=window.__game;g.state.flags.exited=true;g.state.revealed.add('sortie');while(g.ui.top()==='dialog'){g.ui.dialog.finishLine();g.ui.dialog.advance();}const W=await import('/js/world.js');g.interactTarget({kind:'object',o:W.OBJECTS.find(o=>o.type==='busstop')});});await p.keyboard.press('Enter');await p.getByRole('button',{name:'Prendre le bus'}).click();await p.locator('#epilogue').waitFor();};
 try{
  await p.goto('http://localhost:8787/classic.html');await p.getByRole('button',{name:'Explorer en solo ↗'}).click();await cards();
  await p.evaluate(()=>{const s=window.__game.state;s.debt=123;s.revealed.add('avantage');});await end();
  await p.getByRole('button',{name:'Revenir vendredi prochain',exact:true}).click();await p.waitForFunction(()=>!!window.__game&&!document.querySelector('#btn-continue').hidden);await p.waitForTimeout(300);
  const data=await p.evaluate(()=>JSON.parse(localStorage.getItem('rnvp-save')));if(data.night!==2||data.debt!==123||!data.revealed.includes('avantage'))throw Error('Next evening overwritten: '+JSON.stringify(data));
  await p.getByRole('button',{name:'Revenir vendredi prochain',exact:true}).click();await cards();if(await p.evaluate(()=>window.__game.state.night)!==2)throw Error('Night 2 not loaded');
  await end();await p.getByRole('button',{name:'Recommencer depuis le début',exact:true}).click();await p.waitForFunction(()=>!!window.__game&&!window.__game.state.started);await p.waitForTimeout(500);
  if(await p.evaluate(()=>localStorage.getItem('rnvp-save'))!==null)throw Error('Restart recreated save');
  if(errors.length)throw Error(errors.join('\n'));return {passed:['Deuxième soirée : dette et découvertes conservées','Recommencer : sauvegarde effacée durablement'],consoleErrors:errors};
 }finally{await context.close();}
}

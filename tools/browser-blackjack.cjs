async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:1200,height:900}}),p=await context.newPage(),errors=[],passed=[];
 p.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m);};
 const cards=async()=>{await p.locator('.story-line').waitFor();for(let i=0;i<12&&!await p.evaluate(()=>window.__game.state.started);i++){await p.keyboard.press('Enter');await p.waitForTimeout(150);}await p.waitForFunction(()=>window.__game.state.started);};
 const close=()=>p.evaluate(()=>window.__game.ui.panel.close());
 // Fixed shoes exercise specific UI branches; production uses crypto randomness.
 const table=async(ranks,chips=1000)=>{await close();await p.evaluate(({ranks,chips})=>{const g=window.__game,remaining=Array.from({length:312},(_,i)=>i),drawn=[];for(const r of ranks){const i=remaining.findIndex(c=>c%13+1===r);drawn.push(remaining.splice(i,1)[0]);}g.state.chips=chips;g.state.blackjack={version:1,shoe:[...remaining,...drawn.reverse()],shoeNumber:1,round:null};g.games.openBlackjack();},{ranks,chips});};
 try {
  await p.goto('http://localhost:8787/classic.html');await p.getByRole('button',{name:'Explorer en solo ↗'}).click();await cards();
  await table([10,10,7,9],300000);await p.locator('#g-bet-custom').fill('100000');await p.locator('#g-bet-apply').click();
  check(await p.locator('#g-bet-custom').inputValue()==='100000','custom 100,000 stake not retained');await p.locator('#g-deal').click();
  check(await p.evaluate(()=>window.__game.state.blackjack.round.baseBet)===100000,'100,000 stake refused');check(await p.evaluate(()=>window.__game.state.chips)===200000,'100,000 stake debited incorrectly');passed.push('Mise libre de 100 000 jetons');
  await table([8,6,8,10,3,10,2,10,5]);await p.locator('#g-deal').click();await p.locator('#g-split').click();await p.locator('#g-double').click();
  const before=await p.evaluate(()=>JSON.stringify({bj:window.__game.state.blackjack,chips:window.__game.state.chips}));
  await close();await p.evaluate(()=>window.__game.games.openBlackjack());check(await p.locator('.bj-hand').count()===2,'split hands not restored');
  check(await p.evaluate(()=>JSON.stringify({bj:window.__game.state.blackjack,chips:window.__game.state.chips}))===before,'closing changed the round');
  await p.reload();await p.locator('#btn-continue').click();await p.waitForFunction(()=>window.__game.state.started);await p.evaluate(()=>window.__game.games.openBlackjack());
  check(await p.evaluate(()=>JSON.stringify({bj:window.__game.state.blackjack,chips:window.__game.state.chips}))===before,'reload changed round or wallet');
  await p.locator('#g-double').click();check(await p.evaluate(()=>window.__game.state.chips)===950,'split double payout');passed.push('Partage, double et sauvegarde de la main après fermeture/rechargement');
  await table([10,9,6,7]);await p.locator('#g-deal').click();await p.locator('#g-surrender').click();check(await p.evaluate(()=>window.__game.state.chips)===987.5,'surrender payout');passed.push('Abandon tardif : demi-mise remboursée');
  await table([1,1,13,13],25);await p.locator('#g-deal').click();check(await p.locator('#g-ins-yes').isDisabled(),'insurance should require funds');await p.locator('#g-even-money').click();check(await p.evaluate(()=>window.__game.state.chips)===50,'even money payout');passed.push('Assurance et paiement égal');
  await table([10,1,8,6]);await p.locator('#g-deal').click();await p.locator('#g-ins-no').click();await p.locator('#g-stand').click();check(await p.evaluate(()=>window.__game.state.blackjack.round.dealer.length)===2,'soft 17 hit');passed.push('Croupier restant sur 17 souple');
  await p.setViewportSize({width:390,height:844});await table([8,6,8,10,8,8,8]);await p.locator('#g-deal').click();for(let i=0;i<3;i++)await p.locator('#g-split').click();
  check(await p.locator('.bj-hand').count()===4,'four mobile hands');check(await p.locator('#g-split').isDisabled(),'fifth split enabled');
  check(await p.evaluate(()=>Array.from(document.querySelectorAll('.bj,.bj-table,.bj-hands,.bj-hand')).every(e=>e.scrollWidth<=e.clientWidth+1)),'blackjack horizontal overflow');
  await p.locator('.bj-table').scrollIntoViewIfNeeded();await p.waitForTimeout(400);await p.screenshot({path:'output/playwright/blackjack-mobile.png'});passed.push('Quatre mains sur mobile sans débordement horizontal');
  await close();await p.evaluate(()=>{const g=window.__game;g.state.bank=0;g.state.money=0;g.games.openATM();});for(let i=0;i<5;i++)await p.locator('[data-w="200"]').click();
  check(await p.evaluate(()=>window.__game.state.bank)===-1024.5,'ATM cap or wrong fees');await close();
  await p.evaluate(()=>{window.__game.state.money=0;window.__game.games.openPhone();});await p.locator('#ph-open').click();await p.locator('[data-d="100"]').click();check(await p.evaluate(()=>window.__game.state.bank)===-1124.5,'casino deposit capped');await close();
  await p.evaluate(()=>window.__game.games.openPhone());await p.locator('#ph-bets').click();await p.locator('[data-d="50"]').click();check(await p.evaluate(()=>window.__game.state.bank)===-1174.5,'sports deposit capped');passed.push('Découvert au-delà de 1 000 € au distributeur et dans les deux applications');
  check(!errors.length,errors.join('\n'));return {passed,consoleErrors:errors};
 } finally {await context.close();}
}

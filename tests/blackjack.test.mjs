import test from 'node:test';
import assert from 'node:assert/strict';
import {Blackjack, handValue, cardRank, natural} from '../js/blackjack.js';
import {shuffledDeck} from '../js/random.js';
const rankCard=r=>r-1;
test('fresh shoe burns one card; no reshuffle during a round; bankroll never selects cards',()=>{
 const make=(chips,bank)=>new Blackjack({chips,bank},{random:()=>0});
 const a=make(1000,0),b=make(100000,-100000);
 a.start(25);b.start(500);
 assert.deepEqual(a.round.dealer,b.round.dealer);assert.deepEqual(a.hand.cards,b.hand.cards);
 assert.deepEqual(a.data.shoe,b.data.shoe);assert.equal(a.data.shoe.length,307);
 a.act('stand');const remaining=a.data.shoe.length;
 a.start(25);assert.equal(a.data.shoeNumber,1);assert.ok(a.data.shoe.length<=remaining-4);
 if(a.active){if(a.round.phase==='insurance')a.insurance(false);if(a.active)a.act('stand');}
 a.data.shoe=a.data.shoe.slice(0,77);a.start(25);
 assert.equal(a.data.shoeNumber,2);assert.equal(a.data.shoe.length,307);
});
function table(ranks, chips=1000) {
  const remaining=Array.from({length:312},(_,i)=>i), drawn=[];
  for(const rank of ranks){const i=remaining.findIndex(c=>cardRank(c)===rank);assert.ok(i>=0);drawn.push(remaining.splice(i,1)[0]);}
  const state={chips,blackjack:{version:1,shoe:[...remaining,...drawn.reverse()],shoeNumber:1,round:null}};
  const wagers=[],payouts=[],rounds=[];
  const game=new Blackjack(state,{onWager:(amount,kind)=>wagers.push({amount,kind}),onPayout:v=>payouts.push(v),onRound:r=>rounds.push(r)});
  return {game,state,wagers,payouts,rounds};
}
test('six real packs: 312 unique cards, 24 of each rank; exact natural blackjack probability',()=>{
 const shoe=shuffledDeck();assert.equal(shoe.length,312);assert.equal(new Set(shoe).size,312);
 for(let rank=1;rank<=13;rank++)assert.equal(shoe.filter(c=>cardRank(c)===rank).length,24);
 let blackjacks=0;for(const a of shoe)for(const b of shoe)if(a!==b&&natural([a,b]))blackjacks++;
 assert.equal(blackjacks,4608);assert.ok(Math.abs(blackjacks/(312*311)-0.04749)<.00001);
 assert.deepEqual(handValue([rankCard(1),rankCard(1),rankCard(9)]),{total:21,soft:true});
 assert.deepEqual(handValue([rankCard(1),rankCard(1),rankCard(9),rankCard(10)]),{total:21,soft:false});
});
test('blackjack pays 3:2, pushes against dealer blackjack, ordinary loss stays possible',()=>{
 let t=table([1,9,13,7]);t.game.start(25);assert.equal(t.state.chips,1037.5);assert.equal(t.game.round.net,37.5);
 t=table([1,10,13,1]);t.game.start(25);assert.equal(t.state.chips,1000);
 t=table([10,10,7,9]);t.game.start(25);t.game.act('stand');assert.equal(t.state.chips,975);assert.equal(t.game.round.net,-25);
});
test('dealer checks blackjack before offering double, split or surrender',()=>{
 const t=table([8,10,8,1]);t.game.start(25);assert.equal(t.game.round.phase,'settled');
 assert.equal(t.state.chips,975);assert.throws(()=>t.game.act('split'));assert.throws(()=>t.game.act('surrender'));
});
test('insurance and even money include all wagers and returns exactly once',()=>{
 let t=table([10,1,6,13]);t.game.start(25);assert.equal(t.game.round.phase,'insurance');t.game.insurance(true);
 assert.equal(t.state.chips,1000);assert.equal(t.game.round.wagered,37.5);assert.equal(t.game.round.payout,37.5);assert.equal(t.game.round.net,0);
 assert.equal(t.wagers[1].kind,'insurance');assert.throws(()=>t.game.insurance(true));assert.equal(t.payouts.length,1);
 t=table([1,1,13,9]);t.game.start(25);t.game.insurance(true);assert.equal(t.state.chips,1025);assert.equal(t.game.round.net,25);
 t=table([1,1,13,13],25);t.game.start(25);assert.throws(()=>t.game.insurance(true));assert.equal(t.game.round.phase,'insurance');
 t.game.evenMoney();assert.equal(t.state.chips,50);assert.equal(t.game.round.net,25);
});
test('dealer stands on soft 17; a normal 21 cannot replace a blackjack',()=>{
 const t=table([10,1,8,6]);t.game.start(25);t.game.insurance(false);t.game.act('stand');
 assert.equal(t.game.round.dealer.length,2);assert.equal(handValue(t.game.round.dealer).total,17);assert.equal(t.state.chips,1025);
});
test('double after split resolves each hand, collects each extra wager and pays separately',()=>{
 const t=table([8,6,8,10,3,10,2,10,5]);t.game.start(25);t.game.act('split');
 assert.equal(t.game.round.hands[1].cards.length,1);assert.ok(t.game.actions().double);
 t.game.act('double');assert.equal(t.game.round.activeHand,1);t.game.act('double');
 assert.equal(t.game.round.wagered,100);assert.equal(t.game.round.payout,50);assert.equal(t.state.chips,950);
 assert.equal(t.rounds.length,1);assert.deepEqual(t.game.round.hands.map(h=>h.bet),[50,50]);
});
test('split aces get exactly one card, cannot be resplit, and 21 pays as an ordinary hand',()=>{
 const t=table([1,6,1,10,13,9,5]);t.game.start(25);t.game.act('split');
 assert.equal(t.game.round.phase,'settled');assert.deepEqual(t.game.round.hands.map(h=>h.cards.length),[2,2]);
 assert.equal(t.game.round.hands[0].payout,25);assert.equal(t.state.chips,975);assert.throws(()=>t.game.act('split'));
});
test('resplitting stops at four hands and actions reject insufficient funds',()=>{
 let t=table([8,6,8,10,8,8,8]);t.game.start(25);for(let i=0;i<3;i++)t.game.act('split');
 assert.equal(t.game.round.hands.length,4);assert.equal(t.game.actions().split,false);assert.throws(()=>t.game.act('split'));assert.equal(t.state.chips,900);
 t=table([8,6,8,10],25);t.game.start(25);assert.equal(t.game.actions().split,false);assert.equal(t.game.actions().double,false);assert.throws(()=>t.game.act('double'));
});
test('late surrender returns half; unavailable after hitting or splitting',()=>{
 let t=table([10,9,6,7]);t.game.start(25);t.game.act('surrender');assert.equal(t.state.chips,987.5);assert.equal(t.game.round.dealer.length,2);
 t=table([2,9,3,7,2]);t.game.start(25);t.game.act('hit');assert.equal(t.game.actions().surrender,false);assert.equal(t.game.actions().double,false);
 t=table([8,9,8,7,2]);t.game.start(25);t.game.act('split');assert.equal(t.game.actions().surrender,false);
});
test('a bust loses even if the dealer could bust; reaching 21 ends the hand automatically',()=>{
 let t=table([10,6,6,10,10]);t.game.start(25);t.game.act('hit');assert.equal(t.state.chips,975);assert.equal(t.game.round.dealer.length,2);
 t=table([10,6,5,10,6,4]);t.game.start(25);t.game.act('hit');assert.equal(t.game.round.phase,'settled');assert.equal(t.state.chips,1025);
});
test('JSON reload preserves an unfinished split, its shoe and its stakes; reopening cannot repay',()=>{
 const t=table([8,6,8,10,3,10,2,10,5]);t.game.start(25);t.game.act('split');
 const restored=JSON.parse(JSON.stringify(t.state)),shoe=restored.blackjack.shoe.length;
 const resumed=new Blackjack(restored);assert.equal(restored.chips,950);assert.equal(resumed.data.shoe.length,shoe);
 resumed.act('double');resumed.act('double');assert.equal(restored.chips,950);
 new Blackjack(restored).settle();assert.equal(restored.chips,950);assert.equal(resumed.data.shoeNumber,1);
});

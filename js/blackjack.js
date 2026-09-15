import { randomInt, shuffledDeck } from './random.js';

export const BLACKJACK_RULES = Object.freeze({decks:6,standSoft17:true,blackjackPayout:1.5,maxHands:4,doubleAfterSplit:true,resplitAces:false,lateSurrender:true,cutRemaining:78});
export const cardRank = card => card % 13 + 1;
export const cardValue = card => Math.min(cardRank(card),10);
export function handValue(cards) {
  let total = cards.reduce((sum,c)=>sum+cardValue(c),0);
  const soft = cards.some(c=>cardRank(c)===1) && total+10<=21;
  if(soft)total+=10;
  return {total,soft};
}
export const natural = cards => cards.length===2 && handValue(cards).total===21;
const money = value => Math.round(value * 100) / 100;
const fail = message => {throw new Error(message);};
const freshHand = (cards,bet,split=false,splitAces=false) => ({cards,bet,split,splitAces,status:'playing',payout:0,outcome:''});

// Pure, synchronous table transitions; the entire shoe and round can be saved as JSON.
// Closing a panel never settles, forfeits or rerolls an unfinished hand.
export class Blackjack {
  constructor(state, {random=randomInt,onWager=()=>{},onPayout=()=>{},onRound=()=>{},onChange=()=>{}}={}) {
    this.state=state;this.random=random;this.hooks={onWager,onPayout,onRound,onChange};
    if(!state.blackjack)state.blackjack={version:1,shoe:[],shoeNumber:0,round:null};
  }
  get data(){return this.state.blackjack;}
  get round(){return this.data.round;}
  get active(){return !!this.round && this.round.phase!=='settled';}
  get hand(){return this.round?.hands[this.round.activeHand];}
  debit(amount,kind='blackjack') {
    if(!Number.isFinite(amount)||amount<=0||this.state.chips<amount)fail('Pas assez de jetons pour cette action.');
    this.state.chips=money(this.state.chips-amount);this.hooks.onWager(amount,kind);
  }
  draw(){if(!this.data.shoe.length)fail('Sabot épuisé.');return this.data.shoe.pop();}
  start(bet) {
    if(this.active)fail('Termine la main en cours.');
    if(!Number.isInteger(bet)||bet<10||bet>500)fail('La mise de cette table va de 10 à 500 jetons.');
    this.debit(bet);
    if(this.data.shoe.length<BLACKJACK_RULES.cutRemaining){this.data.shoe=shuffledDeck(BLACKJACK_RULES.decks,this.random);this.data.shoeNumber++;this.draw();}
    const p1=this.draw(),d1=this.draw(),p2=this.draw(),d2=this.draw();
    this.data.round={phase:'player',baseBet:bet,hands:[freshHand([p1,p2],bet)],dealer:[d1,d2],activeHand:0,insuranceBet:0,insurancePayout:0,wagered:bet,payout:0,net:0,evenMoney:false};
    if(cardRank(d1)===1)this.round.phase='insurance';
    else this.resolveInitial();
    this.hooks.onChange();
  }
  insurance(take) {
    if(this.round?.phase!=='insurance')fail('L’assurance n’est pas proposée.');
    if(take){const amount=this.round.baseBet/2;this.debit(amount,'insurance');this.round.insuranceBet=amount;this.round.wagered+=amount;}
    this.resolveInitial();this.hooks.onChange();
  }
  evenMoney() {
    if(this.round?.phase!=='insurance'||!natural(this.hand.cards))fail('Le paiement égal nécessite un blackjack face à un As.');
    this.round.evenMoney=true;this.settle();this.hooks.onChange();
  }
  resolveInitial() {
    this.round.phase='player';
    // US hole-card check occurs before any split, double or late surrender.
    if(natural(this.round.dealer)||natural(this.hand.cards))this.settle();
  }
  actions() {
    const h=this.hand,playing=this.round?.phase==='player'&&h?.status==='playing';
    return {hit:!!playing,stand:!!playing,
      double:!!playing&&h.cards.length===2&&!h.splitAces&&this.state.chips>=h.bet,
      split:!!playing&&h.cards.length===2&&!h.splitAces&&this.round.hands.length<BLACKJACK_RULES.maxHands&&cardValue(h.cards[0])===cardValue(h.cards[1])&&this.state.chips>=h.bet,
      surrender:!!playing&&!h.split&&h.cards.length===2};
  }
  act(action) {
    if(!this.actions()[action])fail('Cette action n’est pas disponible pour cette main.');
    const h=this.hand,r=this.round;
    if(action==='split') {
      this.debit(h.bet);r.wagered+=h.bet;
      const aces=cardRank(h.cards[0])===1;
      // Play the first split hand before dealing the second hand's next card.
      const first=freshHand([h.cards[0],this.draw()],h.bet,true,aces);
      const second=freshHand([h.cards[1]],h.bet,true,aces);
      r.hands.splice(r.activeHand,1,first,second);
      if(aces || handValue(first.cards).total===21){first.status='stood';this.advance();}
    } else {
      if(action==='double'){this.debit(h.bet);r.wagered+=h.bet;h.bet*=2;h.doubled=true;}
      if(action==='hit'||action==='double')h.cards.push(this.draw());
      const total=handValue(h.cards).total;
      if(action==='surrender')h.status='surrendered';
      else if(total>21)h.status='bust';
      else if(action==='stand'||action==='double'||total===21)h.status='stood';
      if(h.status!=='playing')this.advance();
    }
    this.hooks.onChange();
  }
  advance() {
    const r=this.round;
    while(++r.activeHand<r.hands.length) {
      const h=this.hand;
      if(h.cards.length===1)h.cards.push(this.draw());
      if(h.splitAces || handValue(h.cards).total===21){h.status='stood';continue;}
      return;
    }
    this.settle();
  }
  settle() {
    const r=this.round;
    if(!r||r.phase==='settled')return;
    const dealerBJ=natural(r.dealer);
    if(!dealerBJ && !r.evenMoney && r.hands.some(h=>h.status!=='bust'&&h.status!=='surrendered'&&!(natural(h.cards)&&!h.split))) {
      while(handValue(r.dealer).total<17)r.dealer.push(this.draw());
    }
    const dealerTotal=handValue(r.dealer).total;
    for(const h of r.hands) {
      const total=handValue(h.cards).total,bj=natural(h.cards)&&!h.split;
      if(r.evenMoney){h.payout=h.bet*2;h.outcome='Paiement égal';}
      else if(dealerBJ){h.payout=bj?h.bet:0;h.outcome=bj?'Deux blackjacks : égalité':'Blackjack du croupier';}
      else if(h.status==='surrendered'){h.payout=h.bet/2;h.outcome='Abandon : demi-mise rendue';}
      else if(h.status==='bust'){h.payout=0;h.outcome=`Dépassé : ${total}`;}
      else if(bj){h.payout=h.bet*(1+BLACKJACK_RULES.blackjackPayout);h.outcome='Blackjack payé 3 pour 2';}
      else if(dealerTotal>21||total>dealerTotal){h.payout=h.bet*2;h.outcome=dealerTotal>21?'Le croupier dépasse 21':'Main gagnante';}
      else if(total===dealerTotal){h.payout=h.bet;h.outcome='Égalité : mise rendue';}
      else {h.payout=0;h.outcome='Main perdante';}
    }
    r.insurancePayout=dealerBJ?r.insuranceBet*3:0;
    r.payout=money(r.hands.reduce((sum,h)=>sum+h.payout,0)+r.insurancePayout);
    r.net=money(r.payout-r.wagered);r.phase='settled';
    this.state.chips=money(this.state.chips+r.payout);
    this.hooks.onPayout(r.payout);this.hooks.onRound(r);
  }
}

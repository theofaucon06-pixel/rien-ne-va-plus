// Unbiased random integers: no game state, bankroll or previous result is an input.
export function randomInt(max) {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new RangeError('Invalid random range');
  const limit = Math.floor(0x100000000 / max) * max;
  const data = new Uint32Array(1);
  do { crypto.getRandomValues(data); } while (data[0] >= limit);
  return data[0] % max;
}
export const randomUnit = () => randomInt(0x100000000) / 0x100000000;
export function shuffledDeck(decks = 6, random = randomInt) {
  const cards = Array.from({length:52 * decks}, (_, i) => i);
  for(let i=cards.length-1;i>0;i--) {const j=random(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}

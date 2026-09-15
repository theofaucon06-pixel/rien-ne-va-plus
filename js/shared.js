export const COLORS = [
  "#eab76b",
  "#80d4c0",
  "#aeb5ff",
  "#f39da7",
  "#8fc4ec",
  "#c8dd95",
  "#d6a5df",
  "#e6c8a6",
];
export const EMOTES = {
  hello: "Salut !",
  follow: "On explore ensemble ?",
  found: "Une découverte ici !",
  quiz: "On fait un quiz ?",
  bravo: "Bien joué !",
  pause: "Petite pause.",
};
export const REDS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
export const PREDICTIONS = {
  red: "Rouge",
  black: "Noir",
  even: "Pair",
  odd: "Impair",
};
export function predictionWins(c, n) {
  return (
    n !== 0 &&
    (c === "red"
      ? REDS.includes(n)
      : c === "black"
        ? !REDS.includes(n)
        : c === "even"
          ? n % 2 === 0
          : c === "odd" && n % 2 === 1)
  );
}

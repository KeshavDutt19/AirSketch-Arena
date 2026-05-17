import xss from "xss";

const bannedTerms = ["slur", "dox", "password"];

export function sanitizeText(value, max = 240) {
  return xss(String(value || "").slice(0, max).trim(), { whiteList: {}, stripIgnoreTag: true });
}

export function moderateChat(message) {
  const normalized = message.toLowerCase();
  return {
    allowed: !bannedTerms.some((term) => normalized.includes(term)),
    flagged: bannedTerms.some((term) => normalized.includes(term))
  };
}

export function maskWord(word, guessedLetters = []) {
  return word
    .split("")
    .map((char) => (char === " " ? " " : guessedLetters.includes(char.toLowerCase()) ? char : "_"))
    .join("");
}

export function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

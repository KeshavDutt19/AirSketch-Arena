import { wordCategories, wordThemes } from "../data/words/index.js";

const difficulties = ["easy", "medium", "hard"];

function normalizeDifficulty(value) {
  if (value === "casual") return "easy";
  if (value === "standard") return "medium";
  if (value === "chaos") return "hard";
  return difficulties.includes(value) ? value : "medium";
}

function categoryPool(settings = {}) {
  const theme = settings.wordTheme || settings.theme || "all";
  if (theme === "all") return wordCategories;
  const selected = wordCategories.filter((category) => category.theme === theme);
  return selected.length ? selected : wordCategories;
}

function entriesForSettings(settings = {}) {
  const difficulty = normalizeDifficulty(settings.difficulty);
  const entries = [];

  for (const category of categoryPool(settings)) {
    const levels = difficulty === "easy" ? ["easy"] : difficulty === "medium" ? ["easy", "medium"] : ["medium", "hard"];
    for (const level of levels) {
      for (const word of category[level] || []) {
        entries.push({ word, category: category.category, difficulty: level, theme: category.theme });
      }
    }
  }

  for (const word of settings.wordPack || []) {
    entries.push({ word, category: "Custom Theme", difficulty: "medium", theme: "custom" });
  }

  return entries;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function getWordThemes() {
  return wordThemes;
}

export function buildWordChoices(settings = {}, usedWords = new Set(), count = 3) {
  let entries = entriesForSettings(settings);
  if (!entries.length) entries = entriesForSettings({ wordTheme: "all", difficulty: "medium" });

  let fresh = entries.filter((entry) => !usedWords.has(entry.word.toLowerCase()));
  if (fresh.length < count) {
    usedWords.clear();
    fresh = entries;
  }

  const choices = [];
  const seen = new Set();
  for (const entry of shuffle(fresh)) {
    const key = entry.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push(entry);
    if (choices.length === count) break;
  }
  return choices;
}

export function maskWord(word = "", revealedIndexes = []) {
  const revealed = new Set(revealedIndexes);
  return word
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (/[^a-z0-9]/i.test(char)) return char;
      return revealed.has(index) ? char : "_";
    })
    .join(" ");
}

export function revealNextIndex(word = "", revealedIndexes = []) {
  const revealed = new Set(revealedIndexes);
  const candidates = word
    .split("")
    .map((char, index) => ({ char, index }))
    .filter(({ char, index }) => /[a-z0-9]/i.test(char) && !revealed.has(index));
  if (!candidates.length) return revealedIndexes;
  const next = candidates[Math.floor(Math.random() * candidates.length)].index;
  return [...revealedIndexes, next];
}

export function generateThemeWords(theme = "custom") {
  const clean = theme.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() || "custom";
  return [
    `${clean} hero`,
    `${clean} machine`,
    `${clean} skyline`,
    `${clean} mystery`,
    `${clean} champion`
  ];
}

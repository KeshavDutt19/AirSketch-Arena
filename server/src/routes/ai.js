import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { generateThemeWords, getWordThemes } from "../game/words.js";
import { sanitizeText } from "../utils/security.js";

const router = Router();

router.get("/word-themes", (req, res) => {
  res.json({ themes: getWordThemes() });
});

router.use(authRequired);

router.post("/hint", (req, res) => {
  const partial = sanitizeText(req.body.partial || "mysterious drawing", 80);
  res.json({ hint: `It has the energy of ${partial}, but think simpler and more iconic.` });
});

router.post("/detect", (req, res) => {
  const strokeCount = Number(req.body.strokeCount || 0);
  const guesses = strokeCount > 80 ? ["spaceship", "dragon", "skyline"] : ["line", "symbol", "object"];
  res.json({ labels: guesses.map((label, i) => ({ label, confidence: Math.max(0.32, 0.86 - i * 0.18) })) });
});

router.post("/word-theme", (req, res) => {
  res.json({ words: generateThemeWords(sanitizeText(req.body.theme, 40)) });
});

export default router;

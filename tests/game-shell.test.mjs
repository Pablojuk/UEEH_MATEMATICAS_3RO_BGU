// ═══════════════════════════════════════════════════════════════════════════
// Automated Unit Tests: Game Shell Single Declaration & Audio Contract
// ═══════════════════════════════════════════════════════════════════════════

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const gameShellPath = path.resolve("components/game-shell.js");
const indexPath = path.resolve("index.html");

test("Game Shell — Single playSound Declaration Analysis", () => {
  const code = fs.readFileSync(gameShellPath, "utf8");
  
  const playSoundMatches = code.match(/function\s+playSound\b|const\s+playSound\b|let\s+playSound\b/g) || [];
  
  assert.equal(playSoundMatches.length, 1,
    `components/game-shell.js MUST contain exactly 1 declaration of playSound, but found ${playSoundMatches.length}`);
});

test("Game Shell — Audio 404 Prevention Analysis", () => {
  const code = fs.readFileSync(gameShellPath, "utf8");

  assert.doesNotMatch(code, /\.wav["']/i,
    "components/game-shell.js MUST NOT reference legacy .wav audio files");
});

test("Index HTML — No Duplicate game-shell.js Imports", () => {
  const html = fs.readFileSync(indexPath, "utf8");
  
  const gameShellMatches = html.match(/game-shell\.js/g) || [];
  
  assert.ok(gameShellMatches.length <= 1,
    `index.html MUST NOT load game-shell.js multiple times, found ${gameShellMatches.length}`);
});

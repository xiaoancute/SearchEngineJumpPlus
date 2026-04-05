const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadConst(filePath, constName) {
  const source = fs.readFileSync(filePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.${constName} = ${constName};`, context);
  return context[constName];
}

const rootDir = path.resolve(__dirname, "..");
const engineList = loadConst(
  path.join(rootDir, "engineList.js"),
  "searchEngineJumpPlusEngines"
);
const userScriptSource = fs.readFileSync(
  path.join(rootDir, "searchEngineJump.user.js"),
  "utf8"
);

assert.ok(Array.isArray(engineList.ai), "engineList.ai should exist");
assert.deepEqual(
  Array.from(engineList.ai, (item) => item.name),
  ["ChatGPT", "pplx", "Gemini", "Claude", "Kimi", "秘塔搜索"],
  "engineList.ai should expose the expected default AI engines"
);
assert.match(
  userScriptSource,
  /\["AI 搜索",\s*"ai",\s*true\]/,
  "default engineDetails should expose the AI category"
);
assert.match(
  userScriptSource,
  /item\[1\]\s*===\s*"ai"/,
  "saved engineDetails should be backfilled with the AI category when missing"
);
assert.match(
  userScriptSource,
  /engineList\.ai\s*=\s*this\.\#scriptSettingData\.engineList\.ai\.map/,
  "saved engineList should be backfilled with default AI engines when missing"
);

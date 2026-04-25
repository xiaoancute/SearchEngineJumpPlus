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
assert.ok(
  Array.from(engineList.ai).every(
    (item) => typeof item.favicon === "string" && item.favicon.startsWith("data:image")
  ),
  "AI engine favicons should be embedded data URLs so they do not break on sites that block direct favicon access"
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
  /engineList\.ai\s*=\s*defaultAiEngines\.map/,
  "saved engineList should be backfilled with default AI engines when missing"
);
assert.match(
  userScriptSource,
  /@require\s+https:\/\/raw\.githubusercontent\.com\/xiaoancute\/SearchEngineJumpPlus\/master\/engineList\.js/,
  "user script should load engineList from the same GitHub repository as the main script"
);
assert.match(
  userScriptSource,
  /@require\s+https:\/\/raw\.githubusercontent\.com\/xiaoancute\/SearchEngineJumpPlus\/master\/rules\.js/,
  "user script should load rules from the same GitHub repository as the main script"
);
assert.match(
  userScriptSource,
  /const defaultAiEngines = Array\.isArray\(this\.\#scriptSettingData\.engineList\?\.ai\)\s*\?/,
  "AI backfill logic should guard against missing ai defaults instead of reading map from undefined"
);
assert.match(
  userScriptSource,
  /\^https\?:\\\/\\\//,
  "AI migration should detect legacy http(s) favicon URLs from older saved settings"
);
assert.match(
  userScriptSource,
  /existingEngine\.favicon\s*=\s*defaultEngine\.favicon/,
  "AI migration should replace legacy saved favicons with current embedded defaults"
);
assert.match(
  userScriptSource,
  /function resolveEngineFavicon\(/,
  "script should expose a shared favicon resolver for UI rendering"
);
assert.match(
  userScriptSource,
  /dataset\.iqxincustomicon|customIcon:\s*isCustomIcon\s*\?\s*"true"/,
  "settings panel DOM should persist whether an icon is custom"
);
assert.doesNotMatch(
  userScriptSource,
  /data-iqxincustomicon="\$customIcon\$"/,
  "custom icon DOM state should be inserted as a whole attribute so empty values do not leave stray dataset markers behind"
);
assert.match(
  userScriptSource,
  /customIcon/,
  "settings save flow should preserve custom icon intent"
);
assert.match(
  userScriptSource,
  /function findBuiltInEngineDefault\(/,
  "script should be able to detect built-in engines for migration and auto-fetch behavior"
);

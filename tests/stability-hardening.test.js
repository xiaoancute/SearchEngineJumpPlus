const test = require("node:test");
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

function loadCoreHelperFactory(userScriptSource) {
  const startMarker = "// TESTABLE_HELPERS_START";
  const endMarker = "// TESTABLE_HELPERS_END";
  const start = userScriptSource.indexOf(startMarker);
  const end = userScriptSource.indexOf(endMarker);

  assert.notEqual(start, -1, "testable helper marker should exist");
  assert.notEqual(end, -1, "testable helper end marker should exist");

  const snippet = userScriptSource.slice(start, end);
  const context = { console, URL };
  vm.createContext(context);
  vm.runInContext(`${snippet}\nthis.createCoreHelperApi = createCoreHelperApi;`, context);
  return context.createCoreHelperApi;
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

test("settings panel keeps Shadow DOM-local queries for opacity controls", () => {
  assert.doesNotMatch(
    userScriptSource,
    /document\.querySelector\("#setBtnOpacityRange"\)/,
    "opacity controls should not query the main document"
  );
  assert.doesNotMatch(
    userScriptSource,
    /document\.querySelector\("\.iqxin-setBtnOpacityRangeValue"\)/,
    "opacity label should not query the main document"
  );
});

test("jump bar lifecycle no longer overwrites global wheel or scroll handlers", () => {
  assert.doesNotMatch(
    userScriptSource,
    /window\.onwheel\s*=/,
    "jump bar should not overwrite window.onwheel"
  );
  assert.doesNotMatch(
    userScriptSource,
    /document\.onwheel\s*=/,
    "jump bar should not overwrite document.onwheel"
  );
  assert.doesNotMatch(
    userScriptSource,
    /window\.onscroll\s*=/,
    "jump bar should not overwrite window.onscroll"
  );
});

test("helper factory normalizes manual engine URLs and icon inputs safely", () => {
  const createCoreHelperApi = loadCoreHelperFactory(userScriptSource);
  const helpers = createCoreHelperApi(engineList);

  assert.equal(
    helpers.normalizeEngineUrlInput("example.com/search?q=%s"),
    "https://example.com/search?q=%s"
  );
  assert.equal(
    helpers.normalizeEngineUrlInput("https://example.com/search?q=%s"),
    "https://example.com/search?q=%s"
  );
  assert.equal(
    helpers.normalizeEngineUrlInput("javascript:alert(1)"),
    ""
  );
  assert.equal(
    helpers.normalizeEngineIconInput("data:image/png;base64,abc"),
    "data:image/png;base64,abc"
  );
  assert.equal(
    helpers.normalizeEngineIconInput("https://example.com/icon.png"),
    "https://example.com/icon.png"
  );
  assert.equal(
    helpers.normalizeEngineIconInput("data:text/html;base64,abc"),
    ""
  );
});

test("helper factory normalizes stored settings and preserves valid custom categories", () => {
  const createCoreHelperApi = loadCoreHelperFactory(userScriptSource);
  const helpers = createCoreHelperApi(engineList);
  const defaultSettings = {
    version: "5.33.4",
    message: "defaults",
    engineDetails: [
      ["网页", "web", true],
      ["AI 搜索", "ai", true],
    ],
    engineList: {
      web: [
        { name: "Google", url: "https://www.google.com/search?q=%s", favicon: "g" },
      ],
      ai: [
        { name: "ChatGPT", url: "https://chatgpt.com/?q=%s", favicon: "c" },
      ],
    },
    selectSearch: true,
  };

  const normalized = helpers.normalizeStoredSettings(
    {
      version: "5.33.4",
      selectSearch: false,
      engineDetails: [["自定义", "custom", true]],
      engineList: {
        custom: [
          {
            name: "My Search",
            url: "custom.example/search?q=%s",
            favicon: "javascript:alert(1)",
            customIcon: "true",
          },
        ],
        ai: "broken",
      },
    },
    defaultSettings
  );

  assert.equal(normalized.selectSearch, false);
  assert.equal(
    JSON.stringify(normalized.engineDetails),
    JSON.stringify([["自定义", "custom", true]])
  );
  assert.equal(
    normalized.engineList.custom[0].url,
    "https://custom.example/search?q=%s"
  );
  assert.equal(normalized.engineList.custom[0].customIcon, "true");
  assert.equal(
    JSON.stringify(normalized.engineList.ai),
    JSON.stringify(defaultSettings.engineList.ai)
  );
  assert.equal(
    JSON.stringify(normalized.engineList.web),
    JSON.stringify(defaultSettings.engineList.web)
  );
});

test("managed listener helpers can register and tear down listeners", () => {
  const createCoreHelperApi = loadCoreHelperFactory(userScriptSource);
  const helpers = createCoreHelperApi(engineList);
  const target = new EventTarget();
  const cleanup = [];
  let count = 0;

  helpers.addManagedListener(cleanup, target, "ping", () => {
    count += 1;
  });

  target.dispatchEvent(new Event("ping"));
  assert.equal(count, 1);

  helpers.removeManagedListeners(cleanup);
  target.dispatchEvent(new Event("ping"));
  assert.equal(count, 1);
  assert.equal(cleanup.length, 0);
});

test("favicon helpers preserve built-in defaults and custom icon intent", () => {
  const createCoreHelperApi = loadCoreHelperFactory(userScriptSource);
  const helpers = createCoreHelperApi(engineList);
  const defaultAiEngine = engineList.ai.find((item) => item.name === "ChatGPT");

  assert.equal(
    helpers.hasCustomEngineIcon(
      { ...defaultAiEngine },
      "ai"
    ),
    false
  );

  assert.equal(
    helpers.hasCustomEngineIcon(
      {
        ...defaultAiEngine,
        favicon: "https://example.com/custom.png",
      },
      "ai"
    ),
    true
  );

  assert.equal(
    helpers.resolveEngineFavicon(
      { ...defaultAiEngine },
      "ai",
      { getIcon: 2 }
    ),
    "https://www.google.com/s2/favicons?domain=https://chatgpt.com"
  );

  assert.equal(
    helpers.resolveEngineFavicon(
      {
        ...defaultAiEngine,
        favicon: "https://example.com/custom.png",
        customIcon: "true",
      },
      "ai",
      { getIcon: 2 }
    ),
    "https://example.com/custom.png"
  );
});

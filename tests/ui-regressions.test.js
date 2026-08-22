const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const userScriptSource = fs.readFileSync(
  path.join(rootDir, "searchEngineJump.user.js"),
  "utf8"
);

function loadCoreHelperFactory(source) {
  const startMarker = "// TESTABLE_HELPERS_START";
  const endMarker = "// TESTABLE_HELPERS_END";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);

  assert.notEqual(start, -1, "testable helper marker should exist");
  assert.notEqual(end, -1, "testable helper end marker should exist");

  const snippet = source.slice(start, end);
  const context = { console, URL };
  vm.createContext(context);
  vm.runInContext(`${snippet}\nthis.api = createCoreHelperApi({});`, context);
  return context.api;
}

test("settings panel drag handlers never invoke methods on the prototype", () => {
  assert.doesNotMatch(
    userScriptSource,
    /SettingPanel\.prototype\.\w+\s*\(/,
    "prototype-level self calls crash because instance fields (shadowRoot) live on instances only"
  );
});

test("drop list hover handlers do not read zIndex from the event target", () => {
  // 两处悬停处理器都是普通 function，this 指向元素而非实例，
  // `this.zIndex + 1` 会得到 NaN；正确写法是闭包捕获的 self。
  // show() 方法内的 `this.zIndex - 1` 是合法的方法调用，不受影响。
  assert.doesNotMatch(
    userScriptSource,
    /style\.zIndex\s*=\s*this\.zIndex\s*\+\s*1/,
    "hover handlers must use the captured instance (self), not `this`"
  );
});

test("category index helpers survive the zero index in both directions", () => {
  const api = loadCoreHelperFactory(userScriptSource);

  ["categoryStorageKey", "isCategoryKeyEnabled", "flipCategoryKey", "resolveCategoryEntry"].forEach(
    (fnName) => {
      assert.equal(typeof api[fnName], "function", `${fnName} should be exported`);
    }
  );

  // 启用/禁用往返，重点覆盖 index 0（旧的 ±0 编码会丢失状态）
  for (const index of [0, 1, 5, 12]) {
    const enabledKey = api.categoryStorageKey(index, true);
    assert.ok(api.isCategoryKeyEnabled(enabledKey), `index ${index} enabled roundtrip`);

    const disabledKey = api.categoryStorageKey(index, false);
    assert.equal(api.isCategoryKeyEnabled(disabledKey), false, `index ${index} disabled roundtrip`);

    assert.equal(api.flipCategoryKey(disabledKey), String(index), "flip restores enabled key");
    assert.equal(api.flipCategoryKey(String(index)), "-" + index, "flip stores disabled key");
  }

  // 存储映射：正数下标与 "-i" 字符串键互不冲突（含 "-0" vs "0"）
  const map = [];
  map[api.categoryStorageKey(0, true)] = ["网页", "web", true];
  map[api.categoryStorageKey(0, false)] = ["网页", "web", false];

  const enabledEntry = api.resolveCategoryEntry(map, 0);
  assert.deepEqual(enabledEntry.item, ["网页", "web", true]);
  assert.equal(enabledEntry.key, "0");

  delete map[0];
  const disabledEntry = api.resolveCategoryEntry(map, 0);
  assert.deepEqual(disabledEntry.item, ["网页", "web", false]);
  assert.equal(disabledEntry.key, "-0");

  assert.equal(api.resolveCategoryEntry(map, 9), null, "missing category resolves to null");
});

test("matched rule is cloned per runtime so style mutations cannot leak back", () => {
  const api = loadCoreHelperFactory(userScriptSource);

  const sourceRule = { style: "a:b", fixedTop: 10, url: /x/ };
  const clone = api.cloneMatchedRuleForRuntime(sourceRule);

  assert.notEqual(clone, sourceRule);
  clone.style = "mutated";
  clone.fixedTop = null;
  assert.equal(sourceRule.style, "a:b", "source rule must stay pristine");
  assert.equal(sourceRule.fixedTop, 10, "source rule must stay pristine");

  assert.equal(api.cloneMatchedRuleForRuntime(null), null);
});

test("AC-baidu lite timer guards against a missing matched rule", () => {
  assert.doesNotMatch(
    userScriptSource,
    /[^?.\w]matchedRule\.fixedTop2/,
    "bare matchedRule.fixedTop2 throws when selectSearch mode has no rule; use optional chaining"
  );
});

test("dead scrolled variable removed from drop list show()", () => {
  assert.doesNotMatch(userScriptSource, /var\s+scrolled\s*=\s*this\.#getScrolled\(\)/);
});

test("favicon online probe records failure so fallback engages", () => {
  assert.match(userScriptSource, /that\.online\s*=\s*false;/);
});

test("closing or destroying the settings panel restores body scrolling", () => {
  assert.match(userScriptSource, /document\.body\.style\.overflow\s*=\s*""/);
});

test("dark mode listener is registered through managed cleanup and dark sheet is not duplicated", () => {
  assert.doesNotMatch(
    userScriptSource,
    /darkModeQuery\.addEventListener|darkModeQuery\.addListener/,
    "matchMedia listener must go through addManagedListener so runtime restarts do not leak it"
  );
  assert.match(userScriptSource, /removeDarkModeStyles/);
});

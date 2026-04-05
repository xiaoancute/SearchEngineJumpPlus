# Favicon Auto-Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make built-in search engines render favicons from their URLs automatically while preserving user-customized icons and fixing old cached data behavior.

**Architecture:** Extract favicon generation into shared helpers, then use one resolver everywhere the UI renders engine icons. Treat built-in engines differently from user-added engines so built-ins auto-fetch by default, while custom icons remain opt-in and persistent.

**Tech Stack:** Userscript JavaScript, Node.js assertion test script

---

### Task 1: Add a failing test for automatic favicon resolution support

**Files:**
- Modify: `tests/ai-category.test.js`
- Test: `tests/ai-category.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions for:
- a shared favicon resolver function
- a persisted custom icon flag in settings DOM/save flow
- built-in favicon migration logic

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/ai-category.test.js`
Expected: FAIL because the resolver/custom-icon migration logic does not exist yet

- [ ] **Step 3: Write minimal implementation**

Add the shared helper functions and data flag wiring in `searchEngineJump.user.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/ai-category.test.js`
Expected: PASS

### Task 2: Route jump bar and settings panel through the shared resolver

**Files:**
- Modify: `searchEngineJump.user.js`
- Test: `tests/ai-category.test.js`

- [ ] **Step 1: Update jump bar rendering**

Use the shared resolver when building each engine button instead of reading `engine.favicon` directly.

- [ ] **Step 2: Update settings panel rendering**

Use the shared resolver for settings list display while preserving raw stored favicon data in datasets.

- [ ] **Step 3: Persist custom icon intent**

When users add or edit an engine:
- non-empty icon input => mark as custom
- empty icon input => clear custom flag and let auto-fetch take over

- [ ] **Step 4: Run verification**

Run: `node tests/ai-category.test.js`
Expected: PASS

### Task 3: Migrate old built-in favicon cache behavior

**Files:**
- Modify: `searchEngineJump.user.js`
- Test: `tests/ai-category.test.js`

- [ ] **Step 1: Infer built-in engines vs custom entries**

Build a lookup from script defaults so built-ins can be identified reliably by category, name, and URL.

- [ ] **Step 2: Add migration logic**

During settings init:
- mark inferred custom built-in icons so they remain custom
- let built-in defaults fall back to auto-fetch behavior

- [ ] **Step 3: Run verification**

Run: `node tests/ai-category.test.js`
Expected: PASS

### Task 4: Final verification

**Files:**
- Test: `tests/ai-category.test.js`

- [ ] **Step 1: Run focused regression test**

Run: `node tests/ai-category.test.js`
Expected: PASS

- [ ] **Step 2: Run syntax checks**

Run: `node --check searchEngineJump.user.js`
Expected: PASS

Run: `node --check engineList.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add searchEngineJump.user.js tests/ai-category.test.js docs/superpowers/plans/2026-04-05-favicon-auto-fetch.md
git commit -m "feat: auto-fetch built-in favicons"
```

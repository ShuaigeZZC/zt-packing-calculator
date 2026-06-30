# Algorithm Kernel V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a UI-independent industrial packing and physics engine for stretch film roll diameter, process rules, packing layout, and structured JSON output.

**Architecture:** The kernel is split into pure modules for physics, process rules, packing optimization, and output composition. The public entry point accepts normalized numeric input and returns a deterministic JSON object suitable for ERP or API integration.

**Tech Stack:** Node.js ES modules, built-in `node:test`, built-in `node:assert/strict`, no runtime dependencies.

---

### Task 1: Project Baseline

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `docs/superpowers/plans/2026-06-29-algorithm-kernel-v1.md`

- [ ] **Step 1: Add Node test script**

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Verify package script is available**

Run: `npm.cmd test`
Expected: Node test runner starts; before tests exist it reports zero discovered tests.

### Task 2: Public Kernel Behavior

**Files:**
- Create: `test/algorithm-kernel.test.js`
- Create: `src/index.js`
- Create: `src/physics.js`
- Create: `src/rules.js`
- Create: `src/packing.js`

- [ ] **Step 1: Write failing tests for the approved public API**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePackaging } from '../src/index.js';

test('calculates physics values from the architecture formulas', () => {
  const result = calculatePackaging({
    rollCount: 6,
    netWeightG: 15000,
    filmWidthMm: 500,
    coreDiameterMm: 76,
    thicknessMm: 0.017
  });

  const expectedD = Math.sqrt(76 ** 2 + (4000 * 15000) / (Math.PI * 500 * 0.918));
  assert.equal(result.physics.D_final, Math.ceil(expectedD));
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test`
Expected: FAIL because `../src/index.js` does not exist yet.

- [ ] **Step 3: Add minimal implementation exports**

```js
export function calculatePackaging() {
  throw new Error('not implemented');
}
```

- [ ] **Step 4: Run tests to verify RED is now behavioral**

Run: `npm.cmd test`
Expected: FAIL because `calculatePackaging` throws `not implemented`.

### Task 3: Physics Engine

**Files:**
- Modify: `src/physics.js`
- Modify: `src/index.js`
- Test: `test/algorithm-kernel.test.js`

- [ ] **Step 1: Implement diameter and length formulas**

```js
export function calculatePhysics(input) {
  const density = input.densityGPerCm3 ?? 0.918;
  return {
    D_raw: Math.sqrt(input.coreDiameterMm ** 2 + (4000 * input.netWeightG) / (Math.PI * input.filmWidthMm * density)),
    length_m: input.netWeightG / (density * input.filmWidthMm * input.thicknessMm)
  };
}
```

- [ ] **Step 2: Run tests**

Run: `npm.cmd test`
Expected: Physics assertions pass; remaining rules and packing assertions fail until implemented.

### Task 4: Rules Engine

**Files:**
- Modify: `src/rules.js`
- Modify: `src/index.js`
- Test: `test/algorithm-kernel.test.js`

- [ ] **Step 1: Implement process rules**

```js
export function applyRules({ rawDiameterMm, filmWidthMm }) {
  const D_final = Math.ceil(rawDiameterMm);
  const height_cm = filmWidthMm / 10 + 3;
  return {
    D_raw: rawDiameterMm,
    D_final,
    rounding_delta: D_final - rawDiameterMm,
    height_cm,
    height_mm: height_cm * 10
  };
}
```

- [ ] **Step 2: Run tests**

Run: `npm.cmd test`
Expected: Physics and rules assertions pass; packing assertions fail until implemented.

### Task 5: Packing Engine and Output

**Files:**
- Modify: `src/packing.js`
- Modify: `src/index.js`
- Test: `test/algorithm-kernel.test.js`

- [ ] **Step 1: Implement factor selection and box dimensions**

```js
export function chooseLayout(rollCount) {
  const industrial = new Map([[4, [2, 2]], [6, [2, 3]], [8, [2, 4]], [9, [3, 3]]]);
  const known = industrial.get(rollCount);
  if (known) return { a: known[0], b: known[1], layout: `${known[0]}x${known[1]}` };
  for (let a = Math.floor(Math.sqrt(rollCount)); a >= 1; a -= 1) {
    if (rollCount % a === 0) return { a, b: rollCount / a, layout: `${a}x${rollCount / a}` };
  }
}
```

- [ ] **Step 2: Run tests**

Run: `npm.cmd test`
Expected: PASS.

### Task 6: Documentation and Final Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document input and output**

```md
# ZT Packing Physics Engine

Pure Node.js algorithm kernel for stretch film roll physics and carton packing.
```

- [ ] **Step 2: Run final verification**

Run: `npm.cmd test`
Expected: all tests pass with no warnings.

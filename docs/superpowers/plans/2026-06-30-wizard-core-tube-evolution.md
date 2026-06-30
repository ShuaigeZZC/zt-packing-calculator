# Wizard Core Tube Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the calculator UI into a five-step wizard and fix the paper-core unit boundary so users see inner diameter while the algorithm receives outer diameter.

**Architecture:** Keep the current static GitHub Pages app and add light Vanilla JS component modules. The algorithm kernel remains unchanged; `ui/packagingAdapter.js` owns all UI-to-kernel conversion, including `coreInnerDiameterMm + 10 = coreOuterDiameterMm`.

**Tech Stack:** Native ES modules, Node.js test runner, existing static server.

---

### Task 1: Core Tube Adapter Contract

**Files:**
- Create: `ui/utils/coreTubeOptions.js`
- Create: `ui/utils/unitConversion.js`
- Modify: `ui/packagingAdapter.js`
- Test: `test/ui-workbench.test.js`

- [ ] **Step 1: Write failing tests**

Cover 3 inch display as `76.2 mm` inner diameter, kernel `coreDiameterMm` as `86.2`, custom inner diameter conversion, and display model retaining inner and outer diameter.

- [ ] **Step 2: Run red test**

Run: `npm.cmd test -- test\ui-workbench.test.js`
Expected: FAIL because the current adapter passes `76.2` directly to the kernel.

- [ ] **Step 3: Implement adapter conversion**

Move core options into `ui/utils/coreTubeOptions.js`; expose `CORE_WALL_ALLOWANCE_MM = 10`; parse form state into `coreInnerDiameterMm`, `coreWallAllowanceMm`, and `coreOuterDiameterMm`; pass only outer diameter as `coreDiameterMm` to `calculatePackaging`.

- [ ] **Step 4: Run green test**

Run: `npm.cmd test -- test\ui-workbench.test.js`
Expected: PASS.

### Task 2: Wizard State and Step Gates

**Files:**
- Create: `ui/utils/wizardFlow.js`
- Test: `test/ui-wizard.test.js`

- [ ] **Step 1: Write failing tests**

Cover Step 1 required field gate, Step 2 required field gate, completed steps being clickable, future steps staying locked, and form state surviving step changes.

- [ ] **Step 2: Run red test**

Run: `npm.cmd test -- test\ui-wizard.test.js`
Expected: FAIL because wizard helpers do not exist yet.

- [ ] **Step 3: Implement wizard helpers**

Add `WIZARD_STEPS`, `canEnterStep`, `validateStep`, and `updateWizardState` helpers that are independent from the DOM and easy to test.

- [ ] **Step 4: Run green test**

Run: `npm.cmd test -- test\ui-wizard.test.js`
Expected: PASS.

### Task 3: Five Step UI Components

**Files:**
- Create: `ui/components/Stepper.js`
- Create: `ui/components/ProductParamsStep.js`
- Create: `ui/components/CoreAndPackingStep.js`
- Create: `ui/components/CalculationResultStep.js`
- Create: `ui/components/HistoricalReferenceStep.js`
- Create: `ui/components/DecisionExportStep.js`
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Test: `test/ui-components.test.js`

- [ ] **Step 1: Write failing component tests**

Cover the five step labels, paper-core inner/outer explanation text, history disclaimer, decision action buttons, and JSON staying in the export step.

- [ ] **Step 2: Run red test**

Run: `npm.cmd test -- test\ui-components.test.js`
Expected: FAIL because component modules do not exist yet.

- [ ] **Step 3: Implement component renderers**

Create pure render functions that return HTML strings. Wire `ui/app.js` to keep form state in memory, render one step at a time, and call the existing historical adapter only after calculation.

- [ ] **Step 4: Run green test**

Run: `npm.cmd test -- test\ui-components.test.js`
Expected: PASS.

### Task 4: Decision JSON and Documentation

**Files:**
- Modify: `src/adapters/historicalReferenceAdapter.js`
- Modify: `README.md`
- Test: `test/historical-reference.test.js`

- [ ] **Step 1: Write failing tests**

Assert decision draft JSON includes core inner/outer metadata and historical references do not mutate or replace algorithm recommendation.

- [ ] **Step 2: Run red test**

Run: `npm.cmd test -- test\historical-reference.test.js`
Expected: FAIL until decision draft accepts core metadata.

- [ ] **Step 3: Implement decision metadata**

Pass `core` metadata from the UI model into decision draft output and document the inner-to-outer rule in README.

- [ ] **Step 4: Run final verification**

Run: `npm.cmd run import:historical`, `npm.cmd test`, `npm.cmd audit`, then verify `http://localhost:4173/ui/index.html` in the browser.

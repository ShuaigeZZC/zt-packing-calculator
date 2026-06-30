import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRules, calculatePackaging, chooseLayout } from '../src/index.js';

const baseInput = {
  rollCount: 6,
  netWeightG: 15000,
  filmWidthMm: 500,
  coreDiameterMm: 76,
  thicknessMm: 0.017
};

function assertApprox(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test('calculates physics values from the architecture worked example', () => {
  const result = calculatePackaging(baseInput);

  assert.equal(result.input.density_g_cm3, 0.00916);
  assertApprox(result.physics.D_raw, 217.8898462287299);
  assert.equal(result.physics.D_final, 218);
  assertApprox(result.physics.rounding_delta, 0.11015377127009174);
  assertApprox(result.physics.length_m, 1926.534806062163);
});

test('uses custom density when provided', () => {
  const result = calculatePackaging({ ...baseInput, densityGPerCm3: 0.0094 });

  assert.equal(result.input.density_g_cm3, 0.0094);
  assertApprox(result.physics.D_raw, 215.432830875907);
  assert.equal(result.physics.D_final, 216);
  assertApprox(result.physics.rounding_delta, 0.567169124092572);
  assertApprox(result.physics.length_m, 1877.34668335419);
});

test('uses business density factor units for film length', () => {
  const result = calculatePackaging({
    rollCount: 6,
    netWeightG: 1648.8,
    filmWidthMm: 500,
    coreDiameterMm: 76.2,
    thicknessMm: 0.012,
    densityGPerCm3: 0.00916
  });

  assertApprox(result.physics.length_m, 300);
  assertApprox(result.physics.D_raw, 101.93185155311653);
  assert.equal(result.physics.D_final, 102);
});

test('applies process rules from raw diameter and film width', () => {
  const rules = applyRules({ rawDiameterMm: 217.681270321683, filmWidthMm: 500 });

  assert.equal(rules.D_raw, 217.681270321683);
  assert.equal(rules.D_final, 218);
  assertApprox(rules.rounding_delta, 0.3187296783169984);
  assert.equal(rules.base_height_cm, 50);
  assert.equal(rules.safety_allowance_cm, 3);
  assert.equal(rules.height_cm, 53);
  assert.equal(rules.height_mm, 530);
});

test('generates carton dimensions for six rolls from final diameter and height', () => {
  const result = calculatePackaging(baseInput);

  assert.equal(result.rules.height_cm, 53);
  assert.equal(result.rules.height_mm, 530);
  assert.equal(result.packing.layout, '2x3');
  assert.deepEqual(result.packing.factors, { a: 2, b: 3 });
  assert.deepEqual(result.packing.box_dimensions_mm, {
    length: 436,
    width: 654,
    height: 530
  });
});

test('returns deterministic JSON output for the public packaging pipeline', () => {
  assert.deepEqual(calculatePackaging(baseInput), {
    input: {
      roll_count: 6,
      net_weight_g: 15000,
      film_width_mm: 500,
      core_diameter_mm: 76,
      thickness_mm: 0.017,
      density_g_cm3: 0.00916
    },
    physics: {
      D_raw: 217.8898462287299,
      D_final: 218,
      rounding_delta: 0.11015377127009174,
      length_m: 1926.534806062163
    },
    rules: {
      base_height_cm: 50,
      safety_allowance_cm: 3,
      height_cm: 53,
      height_mm: 530
    },
    packing: {
      layout: '2x3',
      factors: { a: 2, b: 3 },
      box_dimensions_mm: {
        length: 436,
        width: 654,
        height: 530
      },
      optimization: {
        strategy: 'supported-industrial-layout-scoring',
        selected_reason: 'selected 2x3 for 6 rolls using business-priority scoring'
      }
    }
  });
});

test('explains the default packing optimization without debug candidates', () => {
  const result = calculatePackaging(baseInput);

  assert.deepEqual(result.packing.optimization, {
    strategy: 'supported-industrial-layout-scoring',
    selected_reason: 'selected 2x3 for 6 rolls using business-priority scoring'
  });
  assert.equal(Object.hasOwn(result.packing.optimization, 'candidates'), false);
});

test('includes scored candidates only when debug output is requested', () => {
  const result = calculatePackaging(baseInput, { includeDebug: true });

  assert.deepEqual(result.packing.optimization.candidates, [
    {
      layout: '2x3',
      factors: { a: 2, b: 3 },
      score: {
        total: -95.5,
        businessPriorityPenalty: 0,
        squarenessPenalty: 1,
        longSidePenalty: 3,
        manufacturingSimplicityPenalty: 0.5,
        industrialPreferenceBonus: -100
      }
    }
  ]);
});

test('selects only supported industrial layouts', () => {
  assert.deepEqual(chooseLayout(1), { a: 1, b: 1, layout: '1x1' });
  assert.deepEqual(chooseLayout(4), { a: 2, b: 2, layout: '2x2' });
  assert.deepEqual(chooseLayout(6), { a: 2, b: 3, layout: '2x3' });
  assert.deepEqual(chooseLayout(8), { a: 2, b: 4, layout: '2x4' });
  assert.deepEqual(chooseLayout(9), { a: 3, b: 3, layout: '3x3' });
});

test('rejects unsupported industrial roll counts instead of using generic factors', () => {
  for (const rollCount of [2, 3, 5, 7, 10, 12]) {
    assert.throws(() => chooseLayout(rollCount), /unsupported rollCount/);
    assert.throws(() => calculatePackaging({ ...baseInput, rollCount }), /unsupported rollCount/);
  }
});

test('rejects physically invalid inputs', () => {
  assert.throws(() => calculatePackaging({ ...baseInput, rollCount: 0 }), /rollCount/);
  assert.throws(() => calculatePackaging({ ...baseInput, netWeightG: -1 }), /netWeightG/);
  assert.throws(() => calculatePackaging({ ...baseInput, filmWidthMm: 0 }), /filmWidthMm/);
  assert.throws(() => calculatePackaging({ ...baseInput, coreDiameterMm: 0 }), /coreDiameterMm/);
  assert.throws(() => calculatePackaging({ ...baseInput, thicknessMm: 0 }), /thicknessMm/);
  assert.throws(() => calculatePackaging({ ...baseInput, densityGPerCm3: 0 }), /densityGPerCm3/);
});

test('rejects invalid options objects explicitly', () => {
  assert.throws(() => calculatePackaging(baseInput, null), /options/);
});

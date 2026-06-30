import { calculatePhysics } from './physics.js';
import { applyRules } from './rules.js';
import { calculatePacking, chooseLayout } from './packing.js';

const DEFAULT_DENSITY_G_PER_CM3 = 0.00916;

export { applyRules, calculatePacking, calculatePhysics, chooseLayout };

export function calculatePackaging(input, options = {}) {
  const normalized = normalizeInput(input);
  const normalizedOptions = normalizeOptions(options);
  const physics = calculatePhysics(normalized);
  const rules = applyRules({
    rawDiameterMm: physics.D_raw,
    filmWidthMm: normalized.filmWidthMm
  });
  const packing = calculatePacking({
    rollCount: normalized.rollCount,
    diameterMm: rules.D_final,
    heightMm: rules.height_mm,
    includeDebug: normalizedOptions.includeDebug
  });

  return {
    input: {
      roll_count: normalized.rollCount,
      net_weight_g: normalized.netWeightG,
      film_width_mm: normalized.filmWidthMm,
      core_diameter_mm: normalized.coreDiameterMm,
      thickness_mm: normalized.thicknessMm,
      density_g_cm3: normalized.densityGPerCm3
    },
    physics: {
      D_raw: physics.D_raw,
      D_final: rules.D_final,
      rounding_delta: rules.rounding_delta,
      length_m: physics.length_m
    },
    rules: {
      base_height_cm: rules.base_height_cm,
      safety_allowance_cm: rules.safety_allowance_cm,
      height_cm: rules.height_cm,
      height_mm: rules.height_mm
    },
    packing
  };
}

function normalizeOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  return {
    includeDebug: options.includeDebug === true
  };
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('input must be an object');
  }

  const normalized = {
    rollCount: input.rollCount,
    netWeightG: input.netWeightG,
    filmWidthMm: input.filmWidthMm,
    coreDiameterMm: input.coreDiameterMm,
    thicknessMm: input.thicknessMm,
    densityGPerCm3: input.densityGPerCm3 ?? DEFAULT_DENSITY_G_PER_CM3
  };

  assertPositiveInteger(normalized.rollCount, 'rollCount');
  assertPositiveNumber(normalized.netWeightG, 'netWeightG');
  assertPositiveNumber(normalized.filmWidthMm, 'filmWidthMm');
  assertPositiveNumber(normalized.coreDiameterMm, 'coreDiameterMm');
  assertPositiveNumber(normalized.thicknessMm, 'thicknessMm');
  assertPositiveNumber(normalized.densityGPerCm3, 'densityGPerCm3');

  return normalized;
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function assertPositiveNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number`);
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_OPTIONS,
  DEFAULT_FORM_VALUES,
  buildPackagingWorkbenchModel,
  deriveCoreTube,
  deriveNetWeightKg,
  parsePackagingForm
} from '../ui/packagingAdapter.js';

const formValues = {
  filmLengthM: '300',
  filmWidthMm: '500',
  thicknessMicron: '12',
  densityGPerCm3: '0.00916',
  coreSpec: '3in',
  customCoreInnerDiameterMm: '',
  rollCount: '6'
};

test('shows 3 inch paper core as 76.2 mm inner diameter', () => {
  const option = CORE_OPTIONS.find((item) => item.value === '3in');

  assert.equal(option.label, '3 inch (76.2 mm 内径)');
  assert.equal(option.coreInnerDiameterMm, 76.2);
  assert.equal(option.coreOuterDiameterMm, undefined);
});

test('adapter passes 86.2 mm outer diameter to the algorithm for 3 inch core', () => {
  const input = parsePackagingForm(formValues);

  assert.equal(input.coreDiameterMm, 86.2);
  assert.equal(input.netWeightG, 1648.8);
  assert.equal(input.filmWidthMm, 500);
  assert.equal(input.thicknessMm, 0.012);
  assert.equal(input.densityGPerCm3, 0.00916);
  assert.equal(input.rollCount, 6);
});

test('adapter derives net weight from film length, width, thickness, and density', () => {
  assert.equal(deriveNetWeightKg(formValues), 1.6488);
  assert.equal(parsePackagingForm(formValues).netWeightG, 1648.8);
});

test('custom paper core input is treated as inner diameter and adds 10 mm for calculation', () => {
  const input = parsePackagingForm({
    ...formValues,
    coreSpec: 'custom',
    customCoreInnerDiameterMm: '76.2'
  });

  assert.equal(input.coreDiameterMm, 86.2);
});

test('display model keeps paper core inner and outer diameter metadata', () => {
  const model = buildPackagingWorkbenchModel(formValues);

  assert.equal(model.ok, true);
  assert.deepEqual(model.core, {
    label: '3 inch',
    innerDiameterMm: 76.2,
    wallAllowanceMm: 10,
    outerDiameterMm: 86.2,
    explanation: '当前选择 3 inch 纸管，行业规格 76.2 mm 为内径。系统计算卷径时按 86.2 mm 外径处理。'
  });
  assert.equal(model.result.input.core_diameter_mm, 86.2);
  assert.notEqual(model.result.input.core_diameter_mm, model.core.innerDiameterMm);
});

test('builds stepper-ready natural language result modules', () => {
  const model = buildPackagingWorkbenchModel(formValues);

  assert.equal(model.ok, true);
  assert.equal(model.inputDisplay.filmLength, '300 m');
  assert.equal(model.inputDisplay.filmWidth, '500 mm');
  assert.equal(model.inputDisplay.netWeight, '1.65 kg');
  assert.equal(model.inputDisplay.thickness, '12 micron');
  assert.equal(model.inputDisplay.density, '0.00916');
  assert.equal(model.inputDisplay.coreSpec, '3 inch (76.2 mm 内径)');

  assert.equal(model.physics.D_raw, '109.61 mm');
  assert.equal(model.physics.D_final, '110 mm');
  assert.equal(model.physics.rounding_delta, '0.39 mm');
  assert.equal(model.physics.length_m, '300 m');
  assert.equal(model.physics.net_weight, '1.65 kg');
  assert.match(model.physics.explanation, /系统计算卷径时按 86.2 mm 外径处理/);
  assert.match(model.physics.explanation, /系统建议按 110 mm 作为单卷外径参与纸箱尺寸计算/);

  assert.equal(model.rules.height_cm, '53 cm');
  assert.equal(model.rules.height_mm, '530 mm');
  assert.equal(model.packing.layout, '2 x 3');
  assert.equal(model.packing.dimensionsMm, '220 x 330 x 530 mm');
  assert.equal(model.packing.dimensionsCm, '22.0 x 33.0 x 53.0 cm');
});

test('developer JSON includes paper core inner and outer diameter explanation', () => {
  const model = buildPackagingWorkbenchModel(formValues);
  const json = JSON.parse(model.json);

  assert.equal(json.core.innerDiameterMm, 76.2);
  assert.equal(json.core.wallAllowanceMm, 10);
  assert.equal(json.core.outerDiameterMm, 86.2);
  assert.equal(json.result.input.core_diameter_mm, 86.2);
});

test('keeps JSON structured while UI display uses kilograms', () => {
  const model = buildPackagingWorkbenchModel(formValues);

  assert.match(model.json, /"net_weight_g": 1648.8/);
  assert.match(model.json, /"thickness_mm": 0.012/);
  assert.match(model.json, /"density_g_cm3": 0.00916/);
  assert.doesNotMatch(model.inputDisplay.netWeight, /\b\d+(?:\.\d+)?\s*g\b/);
});

test('builds document-style error state for unsupported roll counts', () => {
  const model = buildPackagingWorkbenchModel({ ...formValues, rollCount: '5' });

  assert.equal(model.ok, false);
  assert.equal(model.error, 'unsupported rollCount: 5');
  assert.equal(model.json, '');
});

test('default form keeps length input and does not expose quick examples', () => {
  assert.equal(DEFAULT_FORM_VALUES.filmLengthM, '300');
  assert.equal(DEFAULT_FORM_VALUES.thicknessMicron, '12');
  assert.equal(DEFAULT_FORM_VALUES.densityGPerCm3, '0.00916');
  assert.equal(DEFAULT_FORM_VALUES.filmWidthMm, '500');
  assert.equal(Object.hasOwn(DEFAULT_FORM_VALUES, 'netWeightKg'), false);
});

test('deriveCoreTube exposes the reusable core tube conversion', () => {
  assert.deepEqual(deriveCoreTube(formValues), {
    label: '3 inch',
    innerDiameterMm: 76.2,
    wallAllowanceMm: 10,
    outerDiameterMm: 86.2,
    explanation: '当前选择 3 inch 纸管，行业规格 76.2 mm 为内径。系统计算卷径时按 86.2 mm 外径处理。'
  });
});

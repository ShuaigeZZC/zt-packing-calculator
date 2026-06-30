import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_OPTIONS,
  QUICK_EXAMPLES,
  buildPackagingWorkbenchModel,
  parsePackagingForm
} from '../ui/packagingAdapter.js';

const formValues = {
  filmLengthM: '300',
  filmWidthCm: '50',
  thicknessMicron: '12',
  coreSpec: '3in',
  customCoreDiameterMm: '',
  densityGPerCm3: '0.00916',
  rollCount: '6'
};

test('parses document UI units into algorithm kernel input', () => {
  assert.deepEqual(parsePackagingForm(formValues), {
    filmWidthMm: 500,
    thicknessMm: 0.012,
    netWeightG: 1648.8,
    coreDiameterMm: 76.2,
    densityGPerCm3: 0.00916,
    rollCount: 6
  });
});

test('supports friendly core tube options including custom millimeters', () => {
  assert.ok(CORE_OPTIONS.some((option) => option.value === '3in' && option.diameterMm === 76.2));

  assert.equal(parsePackagingForm({ ...formValues, coreSpec: 'custom', customCoreDiameterMm: '80' }).coreDiameterMm, 80);
});

test('builds document-style natural language result modules', () => {
  const model = buildPackagingWorkbenchModel(formValues);

  assert.equal(model.ok, true);
  assert.equal(model.inputDisplay.filmLength, '300 m');
  assert.equal(model.inputDisplay.filmWidth, '50 cm');
  assert.equal(model.inputDisplay.netWeight, '1.65 kg');
  assert.equal(model.inputDisplay.thickness, '12 micron');
  assert.equal(model.inputDisplay.density, '0.00916');
  assert.equal(model.inputDisplay.coreSpec, '3 inch (76.2 mm)');

  assert.equal(model.physics.D_raw, '10.19 cm');
  assert.equal(model.physics.D_final, '10.2 cm');
  assert.equal(model.physics.rounding_delta, '0.01 cm');
  assert.equal(model.physics.length_m, '300 m');
  assert.equal(model.physics.net_weight, '1.65 kg');
  assert.match(model.physics.explanation, /推导单卷净重约为 1.65 kg/);
  assert.match(model.physics.explanation, /理论外径约为 10.19 cm/);
  assert.match(model.physics.explanation, /建议按 10.2 cm/);
  assert.match(model.physics.explanation, /厚度 12 micron/);
  assert.match(model.physics.explanation, /密度系数 0.00916/);
  assert.match(model.physics.explanation, /单卷长度约为 300 m/);

  assert.equal(model.rules.height_cm, '53 cm');
  assert.equal(model.rules.height_mm, '53 cm');
  assert.match(model.rules.explanation, /基础高度为 50 cm/);
  assert.match(model.rules.explanation, /成品箱高按 53 cm 计算/);

  assert.equal(model.packing.layout, '2 x 3');
  assert.equal(model.packing.dimensionsCm, '20.4 x 30.6 x 53.0 cm');
  assert.equal(model.packing.grid.columns, 2);
  assert.equal(model.packing.grid.rows, 3);
  assert.match(model.packing.explanation, /每箱 6 卷/);
  assert.match(model.packing.explanation, /每排 2 卷，共 3 排/);
  assert.match(model.optimization.explanation, /行业常见摆法偏好/);

  const resultDisplayText = [
    model.physics.D_raw,
    model.physics.D_final,
    model.physics.rounding_delta,
    model.physics.length_m,
    model.physics.net_weight,
    model.physics.explanation,
    model.rules.height_cm,
    model.rules.height_mm,
    model.rules.explanation,
    model.packing.dimensionsCm,
    model.packing.explanation
  ].join('\n');
  assert.doesNotMatch(resultDisplayText, /\b\d+(?:\.\d+)?\s*mm\b/);
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

test('provides the five required quick examples', () => {
  assert.equal(QUICK_EXAMPLES.length, 5);
  assert.deepEqual(
    QUICK_EXAMPLES.map((example) => example.title),
    ['示例1（常用）', '示例2（重型）', '示例3（450mm）', '示例4（4卷）', '示例5（8卷）']
  );
  assert.equal(QUICK_EXAMPLES[0].values.thicknessMicron, '12');
  assert.equal(QUICK_EXAMPLES[0].values.densityGPerCm3, '0.00916');
  assert.equal(QUICK_EXAMPLES[0].values.filmLengthM, '300');
  assert.equal(QUICK_EXAMPLES[0].values.filmWidthCm, '50');
  assert.equal(Object.hasOwn(QUICK_EXAMPLES[0].values, 'netWeightKg'), false);
});

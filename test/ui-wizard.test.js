import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WIZARD_STEPS,
  canEnterStep,
  getStepValidation,
  updateWizardState
} from '../ui/utils/wizardFlow.js';

const completeForm = {
  filmLengthM: '300',
  filmWidthMm: '500',
  thicknessMicron: '12',
  densityGPerCm3: '0.00916',
  coreSpec: '3in',
  customCoreInnerDiameterMm: '',
  rollCount: '6'
};

test('wizard exposes the five required steps in order', () => {
  assert.deepEqual(
    WIZARD_STEPS.map((step) => step.title),
    ['产品参数', '纸管与装箱', '计算结果', '历史参考', '确认导出']
  );
});

test('Step 1 blocks progress when product parameters are incomplete', () => {
  const validation = getStepValidation(0, { ...completeForm, filmLengthM: '' }, { hasCalculation: false });

  assert.equal(validation.ok, false);
  assert.match(validation.message, /膜长/);
  assert.equal(canEnterStep(1, { ...completeForm, filmLengthM: '' }, { hasCalculation: false }), false);
});

test('Step 2 blocks calculation when core or roll count is missing', () => {
  const missingCore = getStepValidation(1, { ...completeForm, coreSpec: '' }, { hasCalculation: false });
  const missingRollCount = getStepValidation(1, { ...completeForm, rollCount: '' }, { hasCalculation: false });

  assert.equal(missingCore.ok, false);
  assert.match(missingCore.message, /纸管/);
  assert.equal(missingRollCount.ok, false);
  assert.match(missingRollCount.message, /每箱卷数/);
});

test('custom core requires custom inner diameter before calculating', () => {
  const validation = getStepValidation(
    1,
    { ...completeForm, coreSpec: 'custom', customCoreInnerDiameterMm: '' },
    { hasCalculation: false }
  );

  assert.equal(validation.ok, false);
  assert.match(validation.message, /自定义纸管内径/);
});

test('completed steps can be revisited but future steps stay locked', () => {
  assert.equal(canEnterStep(0, completeForm, { hasCalculation: false, maxCompletedStep: 1 }), true);
  assert.equal(canEnterStep(1, completeForm, { hasCalculation: false, maxCompletedStep: 1 }), true);
  assert.equal(canEnterStep(3, completeForm, { hasCalculation: false, maxCompletedStep: 1 }), false);
  assert.equal(canEnterStep(3, completeForm, { hasCalculation: true, maxCompletedStep: 4 }), true);
});

test('switching wizard steps keeps form state intact', () => {
  const state = updateWizardState(
    {
      currentStep: 0,
      maxCompletedStep: 0,
      form: { ...completeForm }
    },
    { type: 'goToStep', stepIndex: 1, hasCalculation: false }
  );

  assert.equal(state.currentStep, 1);
  assert.equal(state.maxCompletedStep, 1);
  assert.deepEqual(state.form, completeForm);
});

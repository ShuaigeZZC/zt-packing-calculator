export const WIZARD_STEPS = [
  { id: 'product', title: '产品参数' },
  { id: 'core', title: '纸管与装箱' },
  { id: 'calculation', title: '计算结果' },
  { id: 'history', title: '历史参考' },
  { id: 'decision', title: '确认导出' }
];

export function getStepValidation(stepIndex, form, context = {}) {
  if (stepIndex === 0) {
    return validateProductParams(form);
  }

  if (stepIndex === 1) {
    return validateCoreAndPacking(form);
  }

  if (stepIndex >= 2 && !context.hasCalculation) {
    return { ok: false, message: '请先完成产品参数、纸管与装箱方式，并生成算法结果。' };
  }

  return { ok: true, message: '' };
}

export function canEnterStep(stepIndex, form, context = {}) {
  if (stepIndex <= (context.maxCompletedStep ?? 0)) {
    return true;
  }

  if (stepIndex === 1) {
    return validateProductParams(form).ok;
  }

  if (stepIndex >= 2) {
    return validateProductParams(form).ok && validateCoreAndPacking(form).ok && context.hasCalculation === true;
  }

  return true;
}

export function updateWizardState(state, action) {
  if (action.type !== 'goToStep') {
    return state;
  }

  if (!canEnterStep(action.stepIndex, state.form, action)) {
    return {
      ...state,
      errorMessage: getStepValidation(Math.max(0, action.stepIndex - 1), state.form, action).message
    };
  }

  return {
    ...state,
    currentStep: action.stepIndex,
    maxCompletedStep: Math.max(state.maxCompletedStep ?? 0, action.stepIndex),
    errorMessage: ''
  };
}

export function validateProductParams(form) {
  if (!isPositiveNumber(form.filmWidthMm)) {
    return { ok: false, message: '请填写有效的膜宽。' };
  }

  if (!isPositiveNumber(form.thicknessMicron)) {
    return { ok: false, message: '请填写有效的厚度。' };
  }

  if (!isPositiveNumber(form.netWeightKg)) {
    return { ok: false, message: '请填写有效的单卷净重。' };
  }

  if (!isPositiveNumber(form.densityGPerCm3)) {
    return { ok: false, message: '请填写有效的材料密度。' };
  }

  return { ok: true, message: '' };
}

export function validateCoreAndPacking(form) {
  if (!form.coreSpec) {
    return { ok: false, message: '请选择纸管规格。' };
  }

  if (form.coreSpec === 'custom' && !isPositiveNumber(form.customCoreInnerDiameterMm)) {
    return { ok: false, message: '请填写有效的自定义纸管内径。' };
  }

  if (!isPositiveInteger(form.rollCount)) {
    return { ok: false, message: '请填写有效的每箱卷数。' };
  }

  return { ok: true, message: '' };
}

function isPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

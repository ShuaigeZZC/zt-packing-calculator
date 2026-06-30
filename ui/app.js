import { renderStepper } from './components/Stepper.js';
import { renderProductParamsStep } from './components/ProductParamsStep.js';
import { renderCoreAndPackingStep } from './components/CoreAndPackingStep.js';
import { renderCalculationResultStep } from './components/CalculationResultStep.js';
import { renderHistoricalReferenceStep } from './components/HistoricalReferenceStep.js';
import { renderDecisionExportStep } from './components/DecisionExportStep.js';
import { QUICK_EXAMPLES, buildPackagingWorkbenchModel, deriveCoreTube } from './packagingAdapter.js';
import { buildDecisionDraft, buildHistoricalReferenceModel } from '../src/adapters/historicalReferenceAdapter.js';
import { canEnterStep, getStepValidation, validateCoreAndPacking, validateProductParams } from './utils/wizardFlow.js';

const wizardRoot = document.querySelector('#wizard-root');
const initialForm = { ...QUICK_EXAMPLES[0].values };
const state = {
  currentStep: 0,
  maxCompletedStep: 0,
  form: { ...initialForm },
  errorMessage: '',
  model: null,
  historicalData: {
    qualitySummary: {},
    referenceRecords: [],
    anomalyRecords: []
  },
  historicalModel: null,
  decisionDraft: null
};

render();
loadHistoricalData();

document.querySelector('#theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

document.querySelector('#reset-flow').addEventListener('click', () => {
  state.currentStep = 0;
  state.maxCompletedStep = 0;
  state.form = { ...initialForm };
  state.errorMessage = '';
  state.model = null;
  state.decisionDraft = null;
  render();
});

wizardRoot.addEventListener('input', handleFormInput);
wizardRoot.addEventListener('change', handleFormInput);
wizardRoot.addEventListener('click', handleWizardClick);

async function loadHistoricalData() {
  try {
    const response = await fetch('../src/data/historicalCartonReference.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    state.historicalData = await response.json();
  } catch (error) {
    state.historicalData = {
      qualitySummary: { loadError: error.message },
      referenceRecords: [],
      anomalyRecords: []
    };
  }

  refreshHistoricalModel();
  render();
}

function handleFormInput(event) {
  const field = event.target.closest('[name]');
  if (!field) {
    return;
  }

  state.form[field.name] = field.value;
  state.errorMessage = '';
  state.decisionDraft = null;

  if (validateProductParams(state.form).ok && validateCoreAndPacking(state.form).ok) {
    refreshCalculationModel();
    refreshHistoricalModel();
  }

  render();
}

function handleWizardClick(event) {
  const stepButton = event.target.closest('[data-step-index]');
  if (stepButton) {
    goToStep(Number(stepButton.dataset.stepIndex));
    return;
  }

  const exampleButton = event.target.closest('[data-example-index]');
  if (exampleButton) {
    state.form = { ...QUICK_EXAMPLES[Number(exampleButton.dataset.exampleIndex)].values };
    state.errorMessage = '';
    state.decisionDraft = null;
    refreshCalculationModel();
    refreshHistoricalModel();
    render();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    handleAction(actionButton.dataset.action);
    return;
  }

  const decisionButton = event.target.closest('[data-decision-type]');
  if (decisionButton) {
    buildDecision(decisionButton.dataset.decisionType);
    render();
    return;
  }

  const copyButton = event.target.closest('[data-copy-target]');
  if (copyButton) {
    copyTarget(copyButton.dataset.copyTarget);
  }
}

function handleAction(action) {
  if (action === 'back') {
    state.currentStep = Math.max(0, state.currentStep - 1);
    state.errorMessage = '';
    render();
    return;
  }

  if (action === 'next') {
    const validation = getStepValidation(state.currentStep, state.form, { hasCalculation: hasCalculation() });
    if (!validation.ok) {
      state.errorMessage = validation.message;
      render();
      return;
    }

    goToStep(state.currentStep + 1);
    return;
  }

  if (action === 'calculate') {
    const productValidation = getStepValidation(0, state.form, { hasCalculation: false });
    const coreValidation = getStepValidation(1, state.form, { hasCalculation: false });
    if (!productValidation.ok || !coreValidation.ok) {
      state.errorMessage = productValidation.ok ? coreValidation.message : productValidation.message;
      render();
      return;
    }

    refreshCalculationModel();
    refreshHistoricalModel();
    if (!state.model?.ok) {
      state.errorMessage = state.model?.error ?? '当前输入无法完成计算。';
      render();
      return;
    }

    state.currentStep = 2;
    state.maxCompletedStep = Math.max(state.maxCompletedStep, 2);
    state.errorMessage = '';
    render();
    return;
  }

  if (action === 'history') {
    goToStep(3);
    return;
  }

  if (action === 'confirm') {
    goToStep(4);
  }
}

function goToStep(stepIndex) {
  if (!canEnterStep(stepIndex, state.form, { hasCalculation: hasCalculation(), maxCompletedStep: state.maxCompletedStep })) {
    const validation = getStepValidation(Math.max(0, stepIndex - 1), state.form, { hasCalculation: hasCalculation() });
    state.errorMessage = validation.message || '请先完成前面的步骤。';
    render();
    return;
  }

  state.currentStep = stepIndex;
  state.maxCompletedStep = Math.max(state.maxCompletedStep, stepIndex);
  state.errorMessage = '';
  render();
}

function refreshCalculationModel() {
  state.model = buildPackagingWorkbenchModel(state.form);
}

function refreshHistoricalModel() {
  state.historicalModel = buildHistoricalReferenceModel({
    packagingModel: state.model,
    historicalData: state.historicalData,
    limit: 5
  });
}

function buildDecision(decisionType) {
  if (!state.model?.ok) {
    return;
  }

  state.decisionDraft = buildDecisionDraft({
    packagingModel: state.model,
    historicalReferences: state.historicalModel?.references ?? [],
    selectedBox: selectDecisionBox(decisionType),
    decisionType,
    createdAt: new Date().toISOString()
  });
}

function selectDecisionBox(decisionType) {
  const algorithmBox = state.model?.result?.packing?.box_dimensions_mm ?? {};
  const firstReference = state.historicalModel?.references?.[0];

  if (decisionType === 'reference_history' && firstReference) {
    return {
      source: 'historical_reference',
      reference_id: firstReference.id,
      unit: 'cm',
      dimensions_cm: firstReference.box
    };
  }

  if (decisionType === 'manual_adjust') {
    return {
      source: 'manual_pending',
      unit: 'mm',
      algorithm_dimensions_mm: algorithmBox
    };
  }

  if (decisionType === 'customer_special') {
    return {
      source: 'customer_special_requirement',
      unit: 'mm',
      algorithm_dimensions_mm: algorithmBox
    };
  }

  if (decisionType === 'mark_anomaly') {
    return {
      source: 'suspected_anomaly',
      unit: 'mm',
      algorithm_dimensions_mm: algorithmBox
    };
  }

  return {
    source: 'algorithm',
    unit: 'mm',
    dimensions_mm: algorithmBox
  };
}

function render() {
  if (validateProductParams(state.form).ok && validateCoreAndPacking(state.form).ok) {
    refreshCalculationModel();
    refreshHistoricalModel();
  }

  wizardRoot.innerHTML = `
    ${renderStepper({
      currentStep: state.currentStep,
      maxCompletedStep: state.maxCompletedStep,
      form: state.form,
      hasCalculation: hasCalculation()
    })}
    ${renderCurrentStep()}
  `;
}

function renderCurrentStep() {
  if (state.currentStep === 0) {
    return renderProductParamsStep({ form: state.form, errorMessage: state.errorMessage });
  }

  if (state.currentStep === 1) {
    return renderCoreAndPackingStep({
      form: state.form,
      core: deriveCoreTube(state.form),
      errorMessage: state.errorMessage
    });
  }

  if (state.currentStep === 2) {
    return renderCalculationResultStep({ model: state.model });
  }

  if (state.currentStep === 3) {
    return renderHistoricalReferenceStep({ historicalModel: state.historicalModel });
  }

  return renderDecisionExportStep({
    model: state.model,
    historicalModel: state.historicalModel,
    decisionDraft: state.decisionDraft
  });
}

function hasCalculation() {
  return state.model?.ok === true;
}

function copyTarget(target) {
  const payloads = {
    developer: state.model?.json ?? '',
    dimensions: state.model?.copyText?.dimensions ?? '',
    explanation: state.model?.copyText?.explanation ?? '',
    decision: state.decisionDraft ? JSON.stringify(state.decisionDraft, null, 2) : ''
  };

  copyText(payloads[target] ?? '');
}

async function copyText(text) {
  if (!text) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

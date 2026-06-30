import { WIZARD_STEPS, canEnterStep } from '../utils/wizardFlow.js';
import { escapeHtml } from '../utils/unitConversion.js';

export function renderStepper({ currentStep, maxCompletedStep, form = {}, hasCalculation = false }) {
  const steps = WIZARD_STEPS.map((step, index) => {
    const isCurrent = index === currentStep;
    const isAvailable = canEnterStep(index, form, { maxCompletedStep, hasCalculation });
    const classes = ['stepper-item'];
    if (isCurrent) classes.push('is-current');
    if (index < currentStep || index <= maxCompletedStep) classes.push('is-complete');
    if (!isAvailable) classes.push('is-locked');

    return `<button class="${classes.join(' ')}" type="button" data-step-index="${index}" aria-label="${index + 1} ${escapeHtml(
      step.title
    )}" ${
      isAvailable ? '' : 'disabled'
    }><span>${index + 1}</span><em>${escapeHtml(step.title)}</em></button>`;
  }).join('');

  return `<nav class="stepper" aria-label="计算流程">${steps}</nav>`;
}

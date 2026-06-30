import { CORE_OPTIONS } from '../utils/coreTubeOptions.js';
import { escapeHtml, formatCompact } from '../utils/unitConversion.js';

export function renderCoreAndPackingStep({ form, core, errorMessage = '' }) {
  return `
    <section class="wizard-step" aria-labelledby="core-step-title">
      <div class="step-heading">
        <p class="eyebrow">Step 2</p>
        <h2 id="core-step-title">纸管与装箱方式</h2>
        <p>下拉框显示的是行业常用纸管内径；系统计算卷径时会自动增加 10 mm，作为纸管外径。</p>
      </div>
      ${renderError(errorMessage)}
      <div class="form-grid">
        <label class="field">
          <span>纸管规格</span>
          <select name="coreSpec" id="core-spec">
            ${CORE_OPTIONS.map(
              (option) =>
                `<option value="${escapeHtml(option.value)}" ${
                  option.value === form.coreSpec ? 'selected' : ''
                }>${escapeHtml(option.label)}</option>`
            ).join('')}
          </select>
        </label>
        <label class="field ${form.coreSpec === 'custom' ? '' : 'hidden'}" id="custom-core-field">
          <span>自定义纸管内径</span>
          <div class="input-with-unit">
            <input name="customCoreInnerDiameterMm" type="number" min="0" step="0.01" value="${escapeHtml(
              form.customCoreInnerDiameterMm
            )}" />
            <strong>mm</strong>
          </div>
        </label>
        <label class="field">
          <span>每箱卷数</span>
          <div class="input-with-unit">
            <input name="rollCount" type="number" min="1" step="1" value="${escapeHtml(form.rollCount)}" />
            <strong>卷</strong>
          </div>
        </label>
      </div>
      <div class="core-note">
        <strong>计算用外径 = ${formatCompact(core.innerDiameterMm)} + ${formatCompact(
          core.wallAllowanceMm
        )} = ${formatCompact(core.outerDiameterMm)} mm</strong>
        <span>${escapeHtml(core.explanation)}</span>
      </div>
      <div class="step-actions split-actions">
        <button class="secondary-button" type="button" data-action="back">上一步</button>
        <button class="primary-button" type="button" data-action="calculate">开始计算</button>
      </div>
    </section>`;
}

function renderError(message) {
  return message ? `<div class="error-banner">${escapeHtml(message)}</div>` : '';
}

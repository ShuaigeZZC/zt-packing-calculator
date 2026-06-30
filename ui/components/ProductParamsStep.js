import { escapeHtml } from '../utils/unitConversion.js';

export function renderProductParamsStep({ form, errorMessage = '' }) {
  return `
    <section class="wizard-step" aria-labelledby="product-step-title">
      <div class="step-heading">
        <p class="eyebrow">Step 1</p>
        <h2 id="product-step-title">产品参数</h2>
        <p>本步骤用于确定膜卷的基础物理参数，系统会根据膜长、膜宽、厚度和密度推导单卷净重及卷径。</p>
      </div>
      ${renderError(errorMessage)}
      <div class="form-grid">
        <label class="field">
          <span>膜长</span>
          <div class="input-with-unit">
            <input name="filmLengthM" type="number" min="0" step="1" value="${escapeHtml(form.filmLengthM)}" />
            <strong>m</strong>
          </div>
        </label>
        <label class="field">
          <span>膜宽</span>
          <div class="input-with-unit">
            <input name="filmWidthMm" type="number" min="0" step="1" value="${escapeHtml(form.filmWidthMm)}" />
            <strong>mm</strong>
          </div>
        </label>
        <label class="field">
          <span>厚度</span>
          <div class="input-with-unit">
            <input name="thicknessMicron" type="number" min="0" step="0.01" value="${escapeHtml(
              form.thicknessMicron
            )}" />
            <strong>micron</strong>
          </div>
        </label>
        <label class="field">
          <span>材料密度</span>
          <div class="input-with-unit">
            <input name="densityGPerCm3" type="number" min="0" step="0.00001" value="${escapeHtml(
              form.densityGPerCm3
            )}" />
            <strong>g/cm³</strong>
          </div>
        </label>
      </div>
      <div class="step-actions">
        <button class="primary-button" type="button" data-action="next">下一步：纸管与装箱</button>
      </div>
    </section>`;
}

function renderError(message) {
  return message ? `<div class="error-banner">${escapeHtml(message)}</div>` : '';
}

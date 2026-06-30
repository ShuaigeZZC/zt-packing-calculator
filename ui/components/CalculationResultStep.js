import { escapeHtml } from '../utils/unitConversion.js';

export function renderCalculationResultStep({ model }) {
  if (!model?.ok) {
    return `
      <section class="wizard-step">
        <div class="step-heading">
          <p class="eyebrow">Step 3</p>
          <h2>算法推荐结果</h2>
        </div>
        <div class="error-banner">${escapeHtml(model?.error ?? '当前没有可用的算法结果。')}</div>
        <div class="step-actions split-actions">
          <button class="secondary-button" type="button" data-action="back">上一步</button>
        </div>
      </section>`;
  }

  return `
    <section class="wizard-step" aria-labelledby="calculation-step-title">
      <div class="step-heading">
        <p class="eyebrow">Step 3</p>
        <h2 id="calculation-step-title">算法推荐结果</h2>
        <p>${escapeHtml(model.core.explanation)}</p>
      </div>
      <div class="metric-grid result-metrics">
        ${renderMetric('D_raw 理论外径', model.physics.D_raw)}
        ${renderMetric('D_final 修正外径', model.physics.D_final)}
        ${renderMetric('取整增加值', model.physics.rounding_delta)}
        ${renderMetric('单卷长度', model.physics.length_m)}
        ${renderMetric('箱体高度', model.rules.height_mm)}
        ${renderMetric('推荐 layout', model.packing.layout)}
      </div>
      <article class="result-card">
        <div class="card-heading">
          <span>Carton</span>
          <h3>算法推荐纸箱尺寸</h3>
        </div>
        <div class="dimension-hero">
          <strong>${escapeHtml(model.packing.dimensionsMm)}</strong>
          <span>${escapeHtml(model.packing.dimensionsCm)}</span>
        </div>
      </article>
      <article class="result-card">
        <div class="card-heading">
          <span>Explanation</span>
          <h3>自然语言解释</h3>
        </div>
        <p class="explanation">${escapeHtml(model.physics.explanation)}</p>
        <p class="explanation">${escapeHtml(model.rules.explanation)}</p>
        <p class="explanation">${escapeHtml(model.packing.explanation)}</p>
        <p class="explanation">${escapeHtml(model.optimization.explanation)}</p>
      </article>
      <div class="step-actions split-actions">
        <button class="secondary-button" type="button" data-action="back">上一步</button>
        <button class="primary-button" type="button" data-action="history">查看历史参考</button>
      </div>
    </section>`;
}

function renderMetric(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

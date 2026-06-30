import { escapeHtml, formatFixed } from '../utils/unitConversion.js';

export function renderHistoricalReferenceStep({ historicalModel }) {
  const references = historicalModel?.references ?? [];

  return `
    <section class="wizard-step" aria-labelledby="history-step-title">
      <div class="step-heading">
        <p class="eyebrow">Step 4</p>
        <h2 id="history-step-title">历史相似参考</h2>
        <p>${escapeHtml(historicalModel?.disclaimer ?? '历史数据仅作为经验参考，不会覆盖算法推荐结果。')}</p>
      </div>
      ${renderQualitySummary(historicalModel?.qualitySummary)}
      ${
        references.length
          ? `<div class="history-list">${references.map(renderHistoryRow).join('')}</div>`
          : `<p class="empty-state">${escapeHtml(
              historicalModel?.emptyMessage ??
                '暂无高可信历史相似记录，建议优先采用系统推荐尺寸，并记录本次人工确认结果。'
            )}</p>`
      }
      <div class="step-actions split-actions">
        <button class="secondary-button" type="button" data-action="back">上一步</button>
        <button class="primary-button" type="button" data-action="confirm">进入确认</button>
      </div>
    </section>`;
}

function renderHistoryRow(record, index) {
  const confidenceClass = record.confidenceLevel === 'A' ? 'confidence-a' : 'confidence-b';

  return `
    <article class="history-row">
      <div class="history-row-main">
        <div>
          <div class="history-meta">
            <span class="rank-pill">#${index + 1}</span>
            <span class="confidence-pill ${confidenceClass}">${escapeHtml(record.confidenceLevel)}类</span>
            <span>${escapeHtml(record.source || '来源未记录')}</span>
          </div>
          <h3>${escapeHtml(record.customer)}</h3>
          <p>${escapeHtml(record.displayReason)}</p>
        </div>
        <div class="history-size">
          <span>历史箱规</span>
          <strong>${escapeHtml(formatBoxCm(record.box))}</strong>
        </div>
      </div>
      <div class="history-reason">
        <span>${escapeHtml(record.sizeDifference?.summary ?? '暂无尺寸差异记录')}</span>
      </div>
    </article>`;
}

function renderQualitySummary(summary = {}) {
  if (!summary?.totalRecords) {
    return `<div class="quality-summary"><span class="quality-pill muted">暂无历史数据</span></div>`;
  }

  const counts = summary.counts ?? {};
  const items = [
    ['总记录', summary.totalRecords],
    ['A', counts.A ?? 0],
    ['B', counts.B ?? 0],
    ['C/D异常池', summary.anomalyCount ?? 0],
    ['可参考A/B', summary.referenceEligibleCount ?? 0],
    ['参考库', summary.historicalReferenceCount ?? 0]
  ];

  return `<div class="quality-summary">${items
    .map(([label, value]) => `<span class="quality-pill"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`)
    .join('')}</div>`;
}

function formatBoxCm(box = {}) {
  const values = [box.lengthCm, box.widthCm, box.heightCm];
  if (values.some((value) => !Number.isFinite(value))) {
    return '--';
  }

  return `${formatFixed(values[0], 1)} x ${formatFixed(values[1], 1)} x ${formatFixed(values[2], 1)} cm`;
}

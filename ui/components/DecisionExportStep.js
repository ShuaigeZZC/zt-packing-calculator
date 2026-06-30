import { escapeHtml } from '../utils/unitConversion.js';

export function renderDecisionExportStep({ model, historicalModel, decisionDraft }) {
  const references = historicalModel?.references ?? [];
  const selectedDecisionType = decisionDraft?.decision_type ?? '';

  return `
    <section class="wizard-step" aria-labelledby="decision-step-title">
      <div class="step-heading">
        <p class="eyebrow">Step 5</p>
        <h2 id="decision-step-title">确认与导出</h2>
        <p>先确认业务结果，再按需要导出 developer JSON 或决策草稿。</p>
      </div>
      <div class="decision-layout">
        <article class="result-card">
          <div class="card-heading">
            <span>Recommended</span>
            <h3>算法推荐箱规</h3>
          </div>
          <div class="dimension-hero">
            <strong>${escapeHtml(model?.packing?.dimensionsMm ?? '--')}</strong>
            <span>${escapeHtml(model?.packing?.dimensionsCm ?? '--')}</span>
          </div>
          <p class="explanation">${escapeHtml(model?.core?.explanation ?? '')}</p>
        </article>
        <article class="result-card">
          <div class="card-heading">
            <span>References</span>
            <h3>历史参考摘要</h3>
          </div>
          <p class="explanation">${
            references.length
              ? `已匹配 ${references.length} 条 A/B 类历史参考，历史数据不会覆盖算法推荐。`
              : '暂无高可信历史相似记录，建议优先采用系统推荐尺寸。'
          }</p>
        </article>
      </div>
      <div class="decision-actions">
        ${renderDecisionButton('use_algorithm', '采用系统推荐', selectedDecisionType)}
        ${renderDecisionButton('reference_history', '参考历史箱规', selectedDecisionType)}
        ${renderDecisionButton('manual_adjust', '手动调整', selectedDecisionType)}
        ${renderDecisionButton('customer_special', '标记为客户特殊要求', selectedDecisionType)}
        ${renderDecisionButton('mark_anomaly', '标记为疑似异常', selectedDecisionType)}
      </div>
      <p class="decision-note" id="decision-summary">${
        decisionDraft
          ? `已选择“${escapeHtml(decisionLabel(decisionDraft.decision_type))}”，下方已生成决策草稿。`
          : '尚未生成决策草稿。点击上方任一按钮后，会在下方生成草稿。'
      }</p>
      <div class="json-actions">
        <button type="button" data-copy-target="developer">复制 JSON</button>
        <button type="button" data-copy-target="dimensions">复制纸箱尺寸</button>
        <button type="button" data-copy-target="explanation">复制计算说明</button>
        <button type="button" data-copy-target="decision">复制决策草稿</button>
      </div>
      <div class="json-stack">
        <div>
          <p class="json-subtitle">developer JSON</p>
          <pre id="json-output">${escapeHtml(model?.json ?? '')}</pre>
        </div>
        <div>
          <p class="json-subtitle">decision draft JSON</p>
          <pre id="decision-output">${escapeHtml(decisionDraft ? JSON.stringify(decisionDraft, null, 2) : '尚未生成决策草稿。')}</pre>
        </div>
      </div>
      <div class="step-actions split-actions">
        <button class="secondary-button" type="button" data-action="back">上一步</button>
      </div>
    </section>`;
}

function renderDecisionButton(type, label, selectedDecisionType) {
  return `<button class="${type === selectedDecisionType ? 'active' : ''}" type="button" data-decision-type="${type}">${label}</button>`;
}

function decisionLabel(type) {
  return (
    {
      use_algorithm: '采用系统推荐',
      reference_history: '参考历史箱规',
      manual_adjust: '手动调整',
      customer_special: '标记为客户特殊要求',
      mark_anomaly: '标记为疑似异常'
    }[type] ?? type
  );
}

import { QUICK_EXAMPLES, buildPackagingWorkbenchModel } from './packagingAdapter.js';
import { buildDecisionDraft, buildHistoricalReferenceModel } from '../src/adapters/historicalReferenceAdapter.js';

const form = document.querySelector('#calculator-form');
const coreSpec = document.querySelector('#core-spec');
const customCoreField = document.querySelector('#custom-core-field');
const resetButtons = [document.querySelector('#reset-form'), document.querySelector('#reset-form-secondary')];
const themeToggle = document.querySelector('#theme-toggle');
const exampleList = document.querySelector('#example-list');

const initialValues = QUICK_EXAMPLES[0].values;
let currentModel = null;
let historicalData = {
  qualitySummary: {},
  referenceRecords: [],
  anomalyRecords: []
};
let historicalModel = null;
let currentDecisionDraft = null;

renderExamples();
setFormValues(initialValues);
syncCustomCoreField();
render();
loadHistoricalData();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});

form.addEventListener('input', () => {
  syncCustomCoreField();
  render();
});

coreSpec.addEventListener('change', () => {
  syncCustomCoreField();
  render();
});

for (const button of resetButtons) {
  button.addEventListener('click', () => {
    setFormValues(initialValues);
    syncCustomCoreField();
    render();
  });
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

document.querySelector('#copy-json').addEventListener('click', () => copyText(currentModel?.json ?? ''));
document
  .querySelector('#copy-explanation')
  .addEventListener('click', () => copyText(currentModel?.copyText?.explanation ?? ''));
document
  .querySelector('#copy-dimensions')
  .addEventListener('click', () => copyText(currentModel?.copyText?.dimensions ?? ''));
document.querySelector('#copy-decision').addEventListener('click', () => {
  copyText(currentDecisionDraft ? JSON.stringify(currentDecisionDraft, null, 2) : '');
});
document.querySelector('#decision-actions').addEventListener('click', handleDecisionClick);

function render() {
  currentModel = buildPackagingWorkbenchModel(readFormValues());
  currentDecisionDraft = null;
  document.querySelector('#calc-time').textContent = `计算时间：${new Date().toLocaleString('zh-CN')}`;

  if (!currentModel.ok) {
    renderError(currentModel);
    return;
  }

  document.querySelector('#result-status').textContent = '成功';
  document.querySelector('#result-status').classList.remove('error');
  document.querySelector('#error-banner').classList.add('hidden');

  document.querySelector('#physics-draw').textContent = currentModel.physics.D_raw;
  document.querySelector('#physics-dfinal').textContent = currentModel.physics.D_final;
  document.querySelector('#physics-delta').textContent = currentModel.physics.rounding_delta;
  document.querySelector('#physics-length').textContent = currentModel.physics.length_m;
  document.querySelector('#physics-weight').textContent = currentModel.physics.net_weight;
  document.querySelector('#physics-explanation').textContent = currentModel.physics.explanation;

  document.querySelector('#rules-base-height').textContent = currentModel.rules.base_height_cm;
  document.querySelector('#rules-height-cm').textContent = currentModel.rules.height_cm;
  document.querySelector('#rules-height-mm').textContent = currentModel.rules.height_mm;
  document.querySelector('#rules-explanation').textContent = currentModel.rules.explanation;

  document.querySelector('#packing-layout').textContent = currentModel.packing.layout;
  document.querySelector('#packing-dimensions').textContent = currentModel.packing.dimensionsCm;
  document.querySelector('#packing-explanation').textContent = currentModel.packing.explanation;
  document.querySelector('#optimization-explanation').textContent = currentModel.optimization.explanation;
  document.querySelector('#json-output').textContent = currentModel.json;

  renderRollGrid(currentModel.packing.grid);
  renderHistoricalReference();
  renderDecisionDraft();
}

function renderError(model) {
  document.querySelector('#result-status').textContent = '错误';
  document.querySelector('#result-status').classList.add('error');
  document.querySelector('#error-banner').textContent = model.error;
  document.querySelector('#error-banner').classList.remove('hidden');

  for (const selector of [
    '#physics-draw',
    '#physics-dfinal',
    '#physics-delta',
    '#physics-length',
    '#physics-weight',
    '#rules-base-height',
    '#rules-height-cm',
    '#rules-height-mm',
    '#packing-layout',
    '#packing-dimensions'
  ]) {
    document.querySelector(selector).textContent = '--';
  }

  for (const selector of [
    '#physics-explanation',
    '#rules-explanation',
    '#packing-explanation',
    '#optimization-explanation'
  ]) {
    document.querySelector(selector).textContent = '当前输入无法完成计算，请检查参数后重试。';
  }

  document.querySelector('#roll-grid').innerHTML = '';
  document.querySelector('#json-output').textContent = '';
  renderHistoricalReference();
  renderDecisionDraft();
}

function renderRollGrid(grid) {
  const node = document.querySelector('#roll-grid');
  node.style.gridTemplateColumns = `repeat(${grid.columns}, 28px)`;
  node.innerHTML = Array.from({ length: grid.columns * grid.rows }, (_, index) => {
    return `<span class="roll-cell">${index + 1}</span>`;
  }).join('');
}

async function loadHistoricalData() {
  try {
    const response = await fetch('../src/data/historicalCartonReference.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    historicalData = await response.json();
  } catch (error) {
    historicalData = {
      qualitySummary: { loadError: error.message },
      referenceRecords: [],
      anomalyRecords: []
    };
  }

  renderHistoricalReference();
}

function renderHistoricalReference() {
  historicalModel = buildHistoricalReferenceModel({
    packagingModel: currentModel,
    historicalData,
    limit: 3
  });

  document.querySelector('#historical-disclaimer').textContent = historicalModel.disclaimer;
  renderQualitySummary(historicalModel.qualitySummary);

  const list = document.querySelector('#historical-reference-list');
  const empty = document.querySelector('#historical-empty');

  if (!historicalModel.references.length) {
    list.innerHTML = '';
    empty.textContent = historicalModel.emptyMessage;
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = historicalModel.references.map((record, index) => renderHistoryRow(record, index)).join('');
}

function renderQualitySummary(summary = {}) {
  const node = document.querySelector('#historical-quality-summary');

  if (summary.loadError) {
    node.innerHTML = `<span class="quality-pill warning">历史数据加载失败</span>`;
    return;
  }

  if (!summary.totalRecords) {
    node.innerHTML = `<span class="quality-pill muted">暂无历史数据</span>`;
    return;
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

  node.innerHTML = items
    .map(([label, value]) => `<span class="quality-pill"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`)
    .join('');
}

function renderHistoryRow(record, index) {
  const rank = index + 1;
  const confidenceClass = record.confidenceLevel === 'A' ? 'confidence-a' : 'confidence-b';

  return `
    <section class="history-row">
      <div class="history-row-main">
        <div>
          <div class="history-meta">
            <span class="rank-pill">#${rank}</span>
            <span class="confidence-pill ${confidenceClass}">${escapeHtml(record.confidenceLevel)}类</span>
            <span>${escapeHtml(record.source || '来源未记录')}</span>
          </div>
          <h4>${escapeHtml(record.customer)}</h4>
          <p>${escapeHtml(formatHistorySpec(record))}</p>
        </div>
        <div class="history-size">
          <span>历史箱规</span>
          <strong>${escapeHtml(formatBoxCm(record.box))}</strong>
        </div>
      </div>
      <div class="history-reason">
        <span>${escapeHtml(record.displayReason)}</span>
        <span>${escapeHtml(record.sizeDifference?.summary ?? '暂无尺寸差异记录')}</span>
      </div>
    </section>`;
}

function handleDecisionClick(event) {
  const button = event.target.closest('[data-decision-type]');
  if (!button || !currentModel?.ok) {
    return;
  }

  const decisionType = button.dataset.decisionType;
  currentDecisionDraft = buildDecisionDraft({
    packagingModel: currentModel,
    historicalReferences: historicalModel?.references ?? [],
    selectedBox: selectDecisionBox(decisionType),
    decisionType,
    createdAt: new Date().toISOString()
  });

  document.querySelectorAll('#decision-actions button').forEach((item) => {
    item.classList.toggle('active', item === button);
  });
  renderDecisionDraft();
}

function selectDecisionBox(decisionType) {
  const algorithmBox = currentModel?.result?.packing?.box_dimensions_mm ?? {};
  const firstReference = historicalModel?.references?.[0];

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

function renderDecisionDraft() {
  const output = document.querySelector('#decision-output');
  const summary = document.querySelector('#decision-summary');

  if (!currentDecisionDraft) {
    output.textContent = '尚未生成决策草稿。';
    summary.textContent = currentModel?.ok ? '尚未生成决策草稿。' : '当前没有可用的算法结果。';
    document.querySelectorAll('#decision-actions button').forEach((button) => button.classList.remove('active'));
    return;
  }

  output.textContent = JSON.stringify(currentDecisionDraft, null, 2);
  summary.textContent = `已生成“${decisionLabel(currentDecisionDraft.decision_type)}”草稿；该草稿不会写入数据库。`;
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

function renderExamples() {
  exampleList.innerHTML = QUICK_EXAMPLES.map(
    (example, index) => `
      <button class="example-card" type="button" data-index="${index}">
        <strong>${example.title}</strong>
        <span>${example.description}</span>
      </button>`
  ).join('');

  exampleList.addEventListener('click', (event) => {
    const button = event.target.closest('.example-card');
    if (!button) {
      return;
    }

    setFormValues(QUICK_EXAMPLES[Number(button.dataset.index)].values);
    syncCustomCoreField();
    render();
  });
}

function readFormValues() {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormValues(values) {
  for (const [name, value] of Object.entries(values)) {
    if (form.elements[name]) {
      form.elements[name].value = value;
    }
  }
}

function syncCustomCoreField() {
  customCoreField.classList.toggle('hidden', coreSpec.value !== 'custom');
}

function formatHistorySpec(record) {
  const filmWidth = Number.isFinite(record.filmWidthMm) ? `${formatCompactNumber(record.filmWidthMm / 10)} cm` : '--';
  const thickness = Number.isFinite(record.thicknessMm)
    ? `${formatCompactNumber(record.thicknessMm * 1000)} micron`
    : '--';
  const netWeight = Number.isFinite(record.netWeightKg) ? `${formatCompactNumber(record.netWeightKg)} kg` : '--';
  const rollCount = Number.isFinite(record.rollCount) ? `${record.rollCount} 卷/箱` : '--';

  return `规格 ${filmWidth} / ${thickness} / ${netWeight} / ${rollCount}`;
}

function formatBoxCm(box = {}) {
  const values = [box.lengthCm, box.widthCm, box.heightCm];
  if (values.some((value) => !Number.isFinite(value))) {
    return '--';
  }

  return `${formatFixed(values[0])} x ${formatFixed(values[1])} x ${formatFixed(values[2])} cm`;
}

function formatFixed(value) {
  return Number(value).toFixed(1);
}

function formatCompactNumber(value) {
  return Number(value).toString();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

async function copyText(text) {
  if (!text) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

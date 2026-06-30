import { QUICK_EXAMPLES, buildPackagingWorkbenchModel } from './packagingAdapter.js';

const form = document.querySelector('#calculator-form');
const coreSpec = document.querySelector('#core-spec');
const customCoreField = document.querySelector('#custom-core-field');
const resetButtons = [document.querySelector('#reset-form'), document.querySelector('#reset-form-secondary')];
const themeToggle = document.querySelector('#theme-toggle');
const exampleList = document.querySelector('#example-list');

const initialValues = QUICK_EXAMPLES[0].values;
let currentModel = null;

renderExamples();
setFormValues(initialValues);
syncCustomCoreField();
render();

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

function render() {
  currentModel = buildPackagingWorkbenchModel(readFormValues());
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
}

function renderRollGrid(grid) {
  const node = document.querySelector('#roll-grid');
  node.style.gridTemplateColumns = `repeat(${grid.columns}, 28px)`;
  node.innerHTML = Array.from({ length: grid.columns * grid.rows }, (_, index) => {
    return `<span class="roll-cell">${index + 1}</span>`;
  }).join('');
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

async function copyText(text) {
  if (!text) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

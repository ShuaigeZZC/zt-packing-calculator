import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStepper } from '../ui/components/Stepper.js';
import { renderProductParamsStep } from '../ui/components/ProductParamsStep.js';
import { renderCoreAndPackingStep } from '../ui/components/CoreAndPackingStep.js';
import { renderCalculationResultStep } from '../ui/components/CalculationResultStep.js';
import { renderHistoricalReferenceStep } from '../ui/components/HistoricalReferenceStep.js';
import { renderDecisionExportStep } from '../ui/components/DecisionExportStep.js';
import { buildPackagingWorkbenchModel } from '../ui/packagingAdapter.js';

const form = {
  filmLengthM: '300',
  filmWidthMm: '500',
  thicknessMicron: '12',
  densityGPerCm3: '0.00916',
  coreSpec: '3in',
  customCoreInnerDiameterMm: '',
  rollCount: '6'
};

const model = buildPackagingWorkbenchModel(form);
const historicalModel = {
  disclaimer: '历史数据仅作为经验参考，不会覆盖算法推荐结果。',
  references: [
    {
      id: 'A-1',
      confidenceLevel: 'A',
      customer: '测试客户',
      source: '测试!1',
      filmWidthMm: 500,
      thicknessMm: 0.012,
      netWeightKg: 1.65,
      rollCount: 6,
      box: { lengthCm: 22, widthCm: 33, heightCm: 53 },
      displayReason: '膜宽一致，每箱卷数一致。',
      sizeDifference: { summary: '历史箱规相对系统推荐：长 +0.0 cm，宽 +0.0 cm，高 +0.0 cm' }
    }
  ],
  qualitySummary: {
    totalRecords: 283,
    counts: { A: 62, B: 83, C: 76, D: 62 },
    referenceEligibleCount: 145,
    historicalReferenceCount: 76,
    anomalyCount: 138
  },
  emptyMessage: ''
};

test('stepper renders the five required step labels', () => {
  const html = renderStepper({ currentStep: 2, maxCompletedStep: 2 });

  assert.match(html, /1 产品参数/);
  assert.match(html, /2 纸管与装箱/);
  assert.match(html, /3 计算结果/);
  assert.match(html, /4 历史参考/);
  assert.match(html, /5 确认导出/);
  assert.match(html, /is-current/);
});

test('product params step renders length, film width, thickness, and density fields without examples', () => {
  const html = renderProductParamsStep({ form, errorMessage: '' });

  assert.match(html, /产品参数/);
  assert.match(html, /膜长/);
  assert.match(html, /膜宽/);
  assert.match(html, /厚度/);
  assert.match(html, /材料密度/);
  assert.doesNotMatch(html, /单卷净重/);
  assert.doesNotMatch(html, /示例1/);
  assert.doesNotMatch(html, /data-example-index/);
});

test('core and packing step explains inner diameter plus 10 mm outer diameter', () => {
  const html = renderCoreAndPackingStep({ form, core: model.core, errorMessage: '' });

  assert.match(html, /3 inch \(76.2 mm 内径\)/);
  assert.match(html, /计算用外径 = 76.2 \+ 10 = 86.2 mm/);
  assert.match(html, /下拉框显示的是行业常用纸管内径/);
});

test('calculation step renders algorithm recommendation with core explanation', () => {
  const html = renderCalculationResultStep({ model });

  assert.match(html, /算法推荐结果/);
  assert.match(html, /系统建议按 110 mm 作为单卷外径参与纸箱尺寸计算/);
  assert.match(html, /当前选择 3 inch 纸管，行业规格 76.2 mm 为内径/);
  assert.match(html, /220 x 330 x 530 mm/);
  assert.match(html, /22.0 x 33.0 x 53.0 cm/);
});

test('historical reference step keeps history as reference-only evidence', () => {
  const html = renderHistoricalReferenceStep({ historicalModel });

  assert.match(html, /历史相似参考/);
  assert.match(html, /历史数据仅作为经验参考，不会覆盖算法推荐结果。/);
  assert.match(html, /A类/);
  assert.match(html, /测试客户/);
  assert.match(html, /历史膜规格：50.0 cm \/ 12 micron \/ 1.65 kg \/ 6 卷\/箱/);
  assert.doesNotMatch(html, /C类/);
  assert.doesNotMatch(html, /D类/);
});

test('decision export step keeps business result primary and JSON secondary', () => {
  const html = renderDecisionExportStep({
    model,
    historicalModel,
    decisionDraft: null
  });

  assert.match(html, /确认与导出/);
  assert.match(html, /算法推荐箱规/);
  assert.match(html, /采用系统推荐/);
  assert.match(html, /参考历史箱规/);
  assert.match(html, /developer JSON/);
  assert.match(html, /复制 JSON/);
});

test('decision export step shows active state after a decision draft is generated', () => {
  const html = renderDecisionExportStep({
    model,
    historicalModel,
    decisionDraft: {
      decision_type: 'use_algorithm',
      selected_box: { source: 'algorithm' }
    }
  });

  assert.match(html, /class="active" type="button" data-decision-type="use_algorithm"/);
  assert.match(html, /已选择“采用系统推荐”/);
});

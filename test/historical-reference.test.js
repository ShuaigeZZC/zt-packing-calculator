import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePackaging } from '../src/index.js';
import { buildDecisionDraft, buildHistoricalReferenceModel } from '../src/adapters/historicalReferenceAdapter.js';
import { matchHistoricalCartons } from '../src/historical/matchHistoricalCartons.js';

const currentInput = {
  rollCount: 6,
  netWeightG: 1648.8,
  filmWidthMm: 500,
  coreDiameterMm: 86.2,
  thicknessMm: 0.012,
  densityGPerCm3: 0.00916
};

const core = {
  label: '3 inch',
  innerDiameterMm: 76.2,
  wallAllowanceMm: 10,
  outerDiameterMm: 86.2,
  explanation: '当前选择 3 inch 纸管，行业规格 76.2 mm 为内径。系统计算卷径时按 86.2 mm 外径处理。'
};

const algorithmResult = calculatePackaging(currentInput);

const historicalData = {
  qualitySummary: {
    totalRecords: 8,
    counts: { A: 2, B: 2, C: 2, D: 2 },
    referenceEligibleCount: 4,
    anomalyCount: 4
  },
  referenceRecords: [
    {
      id: 'A-near',
      confidenceLevel: 'A',
      customer: '以色列客户',
      source: '以色列!1',
      filmWidthMm: 500,
      thicknessMm: 0.012,
      netWeightKg: 1.65,
      rollCount: 6,
      box: { lengthCm: 22, widthCm: 33, heightCm: 53 },
      comparisonStatus: '接近理论区间'
    },
    {
      id: 'B-near',
      confidenceLevel: 'B',
      customer: '德国客户',
      source: '德国!8',
      filmWidthMm: 500,
      thicknessMm: 0.012,
      netWeightKg: 1.7,
      rollCount: 6,
      box: { lengthCm: 22.5, widthCm: 33.5, heightCm: 53 },
      comparisonStatus: '可参考'
    },
    {
      id: 'A-far',
      confidenceLevel: 'A',
      customer: '远规格客户',
      source: '远!2',
      filmWidthMm: 750,
      thicknessMm: 0.03,
      netWeightKg: 15,
      rollCount: 1,
      box: { lengthCm: 75, widthCm: 30, heightCm: 30 },
      comparisonStatus: '可参考'
    },
    {
      id: 'C-hidden',
      confidenceLevel: 'C',
      customer: '异常客户',
      source: '异常!1',
      filmWidthMm: 500,
      netWeightKg: 1.65,
      rollCount: 6,
      box: { lengthCm: 10, widthCm: 10, heightCm: 10 },
      comparisonStatus: '低于理论最小值'
    },
    {
      id: 'D-hidden',
      confidenceLevel: 'D',
      customer: '禁用客户',
      source: '禁用!1',
      filmWidthMm: 500,
      netWeightKg: 1.65,
      rollCount: 6,
      box: { lengthCm: 22, widthCm: 33, heightCm: 53 },
      comparisonStatus: '禁止进入推荐'
    },
    {
      id: 'B-missing',
      confidenceLevel: 'B',
      customer: '缺字段客户',
      source: '缺字段!1',
      rollCount: 6,
      box: { lengthCm: 22, heightCm: 53 }
    }
  ],
  anomalyRecords: [
    { id: 'C-hidden', confidenceLevel: 'C' },
    { id: 'D-hidden', confidenceLevel: 'D' }
  ]
};

test('historical match only returns A/B reference records', () => {
  const matches = matchHistoricalCartons({
    input: currentInput,
    algorithmResult,
    records: historicalData.referenceRecords,
    limit: 5
  });

  assert.ok(matches.length > 0);
  assert.deepEqual([...new Set(matches.map((match) => match.confidenceLevel))].sort(), ['A', 'B']);
  assert.equal(matches.some((match) => match.id === 'C-hidden' || match.id === 'D-hidden'), false);
});

test('historical match ranks the closest usable record first', () => {
  const matches = matchHistoricalCartons({
    input: currentInput,
    algorithmResult,
    records: historicalData.referenceRecords,
    limit: 3
  });

  assert.equal(matches[0].id, 'A-near');
  assert.ok(matches[0].score > matches[1].score);
  assert.ok(matches[0].reasons.some((reason) => reason.includes('膜宽')));
  assert.ok(matches[0].sizeDifference);
});

test('missing historical fields do not crash matching', () => {
  const matches = matchHistoricalCartons({
    input: currentInput,
    algorithmResult,
    records: [historicalData.referenceRecords.find((record) => record.id === 'B-missing')],
    limit: 3
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'B-missing');
  assert.ok(matches[0].score >= 0);
});

test('empty historical data still returns an algorithm-first model', () => {
  const model = buildHistoricalReferenceModel({
    packagingModel: { ok: true, result: algorithmResult },
    historicalData: { qualitySummary: { totalRecords: 0 }, referenceRecords: [] }
  });

  assert.equal(model.references.length, 0);
  assert.match(model.emptyMessage, /暂无高可信历史相似记录/);
});

test('historical references do not mutate calculatePackaging output', () => {
  const before = calculatePackaging(currentInput);
  buildHistoricalReferenceModel({
    packagingModel: { ok: true, result: before },
    historicalData
  });
  const after = calculatePackaging(currentInput);

  assert.deepEqual(after, before);
});

test('decision draft contains algorithm result, core metadata, and historical references without persistence', () => {
  const historicalModel = buildHistoricalReferenceModel({
    packagingModel: { ok: true, result: algorithmResult },
    historicalData
  });
  const draft = buildDecisionDraft({
    packagingModel: { ok: true, result: algorithmResult, core },
    historicalReferences: historicalModel.references,
    selectedBox: algorithmResult.packing.box_dimensions_mm,
    decisionType: 'use_algorithm',
    operatorNote: '测试确认',
    createdAt: '2026-06-30T10:00:00.000Z'
  });

  assert.equal(draft.decision_type, 'use_algorithm');
  assert.equal(draft.operator_note, '测试确认');
  assert.deepEqual(draft.algorithm_recommendation, algorithmResult.packing.box_dimensions_mm);
  assert.equal(draft.core.innerDiameterMm, 76.2);
  assert.equal(draft.core.outerDiameterMm, 86.2);
  assert.equal(draft.historical_references.length > 0, true);
  assert.equal(Object.hasOwn(draft, 'persisted'), false);
});

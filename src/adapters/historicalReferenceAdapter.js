import { matchHistoricalCartons } from '../historical/matchHistoricalCartons.js';

export function buildHistoricalReferenceModel({ packagingModel, historicalData, limit = 3 }) {
  const qualitySummary = historicalData?.qualitySummary ?? {};

  if (!packagingModel?.ok) {
    return {
      references: [],
      qualitySummary,
      disclaimer: '历史数据仅供参考，不会覆盖算法推荐结果。',
      emptyMessage: '当前算法结果不可用，暂不匹配历史参考。'
    };
  }

  const references = matchHistoricalCartons({
    input: toKernelInput(packagingModel.result.input),
    algorithmResult: packagingModel.result,
    records: historicalData?.referenceRecords ?? [],
    limit
  });

  return {
    references,
    qualitySummary,
    disclaimer: '历史数据仅供参考，不会覆盖算法推荐结果。',
    emptyMessage: references.length
      ? ''
      : '暂无高可信历史相似记录，建议优先采用系统推荐尺寸，并记录本次人工确认结果。'
  };
}

export function buildDecisionDraft({
  packagingModel,
  historicalReferences,
  selectedBox,
  decisionType,
  operatorNote = '',
  createdAt = new Date().toISOString()
}) {
  const result = packagingModel?.result;

  return {
    input_spec: result?.input ?? {},
    core: packagingModel?.core ?? {},
    algorithm_recommendation: result?.packing?.box_dimensions_mm ?? {},
    historical_references: historicalReferences ?? [],
    selected_box: selectedBox ?? {},
    decision_type: decisionType,
    operator_note: operatorNote,
    created_at: createdAt
  };
}

function toKernelInput(input) {
  return {
    rollCount: input.roll_count,
    netWeightG: input.net_weight_g,
    filmWidthMm: input.film_width_mm,
    coreDiameterMm: input.core_diameter_mm,
    thicknessMm: input.thickness_mm,
    densityGPerCm3: input.density_g_cm3
  };
}

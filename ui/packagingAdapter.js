import { calculatePackaging } from '../src/index.js';
import { CORE_OPTIONS, buildCoreTubeModel } from './utils/coreTubeOptions.js';
import { formatCompact, formatFixed, kgToG, micronToMm, mmToCm } from './utils/unitConversion.js';

export { CORE_OPTIONS };

export const DEFAULT_FORM_VALUES = {
  filmLengthM: '300',
  filmWidthMm: '500',
  thicknessMicron: '12',
  densityGPerCm3: '0.00916',
  coreSpec: '3in',
  customCoreInnerDiameterMm: '',
  rollCount: '6'
};

export function deriveCoreTube(values) {
  return buildCoreTubeModel({
    coreSpec: values.coreSpec,
    customCoreInnerDiameterMm: values.customCoreInnerDiameterMm,
    coreWallAllowanceMm: values.coreWallAllowanceMm
  });
}

export function deriveNetWeightKg(values) {
  const filmLengthM = Number(values.filmLengthM);
  const thicknessMicron = Number(values.thicknessMicron);
  const filmWidthCm = Number(values.filmWidthMm) / 10;
  const densityFactor = Number(values.densityGPerCm3);
  const netWeightG = filmLengthM * thicknessMicron * filmWidthCm * densityFactor;

  return Number((netWeightG / 1000).toFixed(4));
}

export function parsePackagingForm(values) {
  const core = deriveCoreTube(values);
  const netWeightKg = deriveNetWeightKg(values);

  return {
    filmWidthMm: Number(values.filmWidthMm),
    thicknessMm: micronToMm(values.thicknessMicron),
    netWeightG: kgToG(netWeightKg),
    // The algorithm kernel field is named coreDiameterMm, but the physics formula needs paper-core outer diameter.
    coreDiameterMm: core.outerDiameterMm,
    densityGPerCm3: Number(values.densityGPerCm3),
    rollCount: Number(values.rollCount)
  };
}

export function buildPackagingWorkbenchModel(values, options = {}) {
  try {
    const input = parsePackagingForm(values);
    const core = deriveCoreTube(values);
    const result = calculatePackaging(input, { includeDebug: options.includeDebug === true });
    const display = buildDisplayModel(values, input, core, result);
    const developerPayload = {
      core,
      result
    };

    return {
      ok: true,
      core,
      result,
      kernelInput: input,
      inputDisplay: display.inputDisplay,
      physics: display.physics,
      rules: display.rules,
      packing: display.packing,
      optimization: display.optimization,
      copyText: display.copyText,
      json: JSON.stringify(developerPayload, null, 2)
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      json: ''
    };
  }
}

function buildDisplayModel(values, input, core, result) {
  const dimensions = result.packing.box_dimensions_mm;
  const layout = result.packing.factors;
  const dimensionsMm = `${formatCompact(dimensions.length)} x ${formatCompact(dimensions.width)} x ${formatCompact(
    dimensions.height
  )} mm`;
  const dimensionsCm = `${formatFixed(mmToCm(dimensions.length), 1)} x ${formatFixed(
    mmToCm(dimensions.width),
    1
  )} x ${formatFixed(mmToCm(dimensions.height), 1)} cm`;

  const thicknessDisplay = `${formatCompact(values.thicknessMicron)} micron`;
  const densityDisplay = formatCompact(input.densityGPerCm3);
  const filmLengthDisplay = `${formatCompact(values.filmLengthM)} m`;
  const filmWidthDisplay = `${formatCompact(input.filmWidthMm)} mm`;
  const netWeightDisplay = `${formatFixed(input.netWeightG / 1000, 2)} kg`;
  const rawDiameterMm = formatFixed(result.physics.D_raw, 2);
  const finalDiameterMm = formatCompact(result.physics.D_final);
  const roundingDeltaMm = formatFixed(result.physics.rounding_delta, 2);
  const lengthM = formatCompact(result.physics.length_m);
  const baseHeightCm = formatCompact(result.rules.base_height_cm);
  const heightCm = formatCompact(result.rules.height_cm);
  const safetyAllowanceCm = formatCompact(result.rules.safety_allowance_cm);

  const physicsExplanation = `根据当前参数，系统计算得到单卷理论外径为 ${rawDiameterMm} mm。按照工艺安全规则向上取整后，系统建议按 ${finalDiameterMm} mm 作为单卷外径参与纸箱尺寸计算。本次取整增加 ${roundingDeltaMm} mm。${core.explanation} 单卷长度约为 ${lengthM} m，推导单卷净重约为 ${netWeightDisplay}。`;

  const rulesExplanation = `膜宽为 ${filmWidthDisplay}，对应基础高度为 ${baseHeightCm} cm。按照当前工艺规则，纸箱高度需要额外增加 ${safetyAllowanceCm} cm 余量，因此建议成品箱高按 ${heightCm} cm（${formatCompact(
    result.rules.height_mm
  )} mm）计算。`;

  const packingExplanation = `每箱 ${input.rollCount} 卷时，系统推荐采用 ${layout.a} x ${layout.b} 的摆放方式，即每排 ${layout.a} 卷，共 ${layout.b} 排。按修正后的单卷外径 ${finalDiameterMm} mm 计算，最终建议纸箱尺寸为 ${dimensionsMm}（${dimensionsCm}）。`;

  const optimizationExplanation = `本次布局选择策略综合考虑业务优先级、接近正方形、空间利用率和行业常见摆法。当前可选工业方案中，${layout.a} x ${layout.b} 最符合已确认的业务优先级，因此被选为推荐方案。`;

  return {
    inputDisplay: {
      filmLength: filmLengthDisplay,
      filmWidth: filmWidthDisplay,
      netWeight: netWeightDisplay,
      thickness: thicknessDisplay,
      density: densityDisplay,
      coreSpec: `${core.label} (${formatCompact(core.innerDiameterMm)} mm 内径)`
    },
    physics: {
      D_raw: `${rawDiameterMm} mm`,
      D_final: `${finalDiameterMm} mm`,
      rounding_delta: `${roundingDeltaMm} mm`,
      length_m: `${lengthM} m`,
      net_weight: netWeightDisplay,
      explanation: physicsExplanation
    },
    rules: {
      base_height_cm: `${baseHeightCm} cm`,
      height_cm: `${heightCm} cm`,
      height_mm: `${formatCompact(result.rules.height_mm)} mm`,
      explanation: rulesExplanation
    },
    packing: {
      layout: `${layout.a} x ${layout.b}`,
      factors: { a: layout.a, b: layout.b },
      dimensionsMm,
      dimensionsCm,
      grid: {
        columns: layout.a,
        rows: layout.b
      },
      explanation: packingExplanation
    },
    optimization: {
      explanation: optimizationExplanation,
      selected_reason: result.packing.optimization.selected_reason,
      candidates: formatDebugCandidates(result.packing.optimization.candidates ?? [])
    },
    copyText: {
      explanation: `${physicsExplanation}\n${rulesExplanation}\n${packingExplanation}\n${optimizationExplanation}`,
      dimensions: `${dimensionsMm} / ${dimensionsCm}`
    }
  };
}

function formatDebugCandidates(candidates) {
  return candidates.map((candidate) => ({
    layout: candidate.layout,
    factors: `${candidate.factors.a} x ${candidate.factors.b}`,
    total: formatFixed(candidate.score.total, 2),
    businessPriorityPenalty: formatFixed(candidate.score.businessPriorityPenalty, 2),
    squarenessPenalty: formatFixed(candidate.score.squarenessPenalty, 2),
    longSidePenalty: formatFixed(candidate.score.longSidePenalty, 2),
    manufacturingSimplicityPenalty: formatFixed(candidate.score.manufacturingSimplicityPenalty, 2),
    industrialPreferenceBonus: formatFixed(candidate.score.industrialPreferenceBonus, 2)
  }));
}

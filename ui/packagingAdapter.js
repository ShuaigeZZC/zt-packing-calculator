import { calculatePackaging } from '../src/index.js';

export const CORE_OPTIONS = [
  { value: '1in', label: '1 inch (25.4 mm)', diameterMm: 25.4 },
  { value: '1_5in', label: '1.5 inch (38.1 mm)', diameterMm: 38.1 },
  { value: '2in', label: '2 inch (50.8 mm)', diameterMm: 50.8 },
  { value: '2_25in', label: '2.25 inch (57.15 mm)', diameterMm: 57.15 },
  { value: '2_5in', label: '2.5 inch (63.5 mm)', diameterMm: 63.5 },
  { value: '3in', label: '3 inch (76.2 mm)', diameterMm: 76.2 },
  { value: 'custom', label: '自定义纸管（mm）', diameterMm: null }
];

export const QUICK_EXAMPLES = [
  {
    title: '示例1（常用）',
    description: '300m / 50cm / 12micron / 6卷',
    values: baseExample({ filmLengthM: '300', filmWidthCm: '50', rollCount: '6' })
  },
  {
    title: '示例2（重型）',
    description: '500m / 50cm / 12micron / 6卷',
    values: baseExample({ filmLengthM: '500', filmWidthCm: '50', rollCount: '6' })
  },
  {
    title: '示例3（450mm）',
    description: '300m / 45cm / 12micron / 6卷',
    values: baseExample({ filmLengthM: '300', filmWidthCm: '45', rollCount: '6' })
  },
  {
    title: '示例4（4卷）',
    description: '300m / 50cm / 12micron / 4卷',
    values: baseExample({ filmLengthM: '300', filmWidthCm: '50', rollCount: '4' })
  },
  {
    title: '示例5（8卷）',
    description: '300m / 50cm / 12micron / 8卷',
    values: baseExample({ filmLengthM: '300', filmWidthCm: '50', rollCount: '8' })
  }
];

export function parsePackagingForm(values) {
  const coreOption = CORE_OPTIONS.find((option) => option.value === values.coreSpec);
  const coreDiameterMm =
    coreOption?.value === 'custom' ? Number(values.customCoreDiameterMm) : Number(coreOption?.diameterMm);
  const filmLengthM = Number(values.filmLengthM);
  const filmWidthCm = Number(values.filmWidthCm);
  const thicknessMicron = Number(values.thicknessMicron);
  const densityFactor = Number(values.densityGPerCm3);
  const netWeightG = filmLengthM * thicknessMicron * filmWidthCm * densityFactor;

  return {
    filmWidthMm: filmWidthCm * 10,
    thicknessMm: thicknessMicron / 1000,
    netWeightG,
    coreDiameterMm,
    densityGPerCm3: densityFactor,
    rollCount: Number(values.rollCount)
  };
}

export function buildPackagingWorkbenchModel(values, options = {}) {
  try {
    const input = parsePackagingForm(values);
    const result = calculatePackaging(input, { includeDebug: options.includeDebug === true });
    const display = buildDisplayModel(values, input, result);

    return {
      ok: true,
      result,
      inputDisplay: display.inputDisplay,
      physics: display.physics,
      rules: display.rules,
      packing: display.packing,
      optimization: display.optimization,
      copyText: display.copyText,
      json: JSON.stringify(result, null, 2)
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      json: ''
    };
  }
}

function buildDisplayModel(values, input, result) {
  const dimensions = result.packing.box_dimensions_mm;
  const layout = result.packing.factors;
  const dimensionsCm = `${toFixed(dimensions.length / 10, 1)} x ${toFixed(dimensions.width / 10, 1)} x ${toFixed(
    dimensions.height / 10,
    1
  )} cm`;
  const coreOption = CORE_OPTIONS.find((option) => option.value === values.coreSpec);

  const thicknessDisplay = `${formatCompact(values.thicknessMicron)} micron`;
  const densityDisplay = formatCompact(input.densityGPerCm3);
  const filmLengthDisplay = `${formatCompact(values.filmLengthM)} m`;
  const filmWidthDisplay = `${formatCompact(input.filmWidthMm / 10)} cm`;
  const netWeightDisplay = `${toFixed(input.netWeightG / 1000, 2)} kg`;
  const rawDiameterCm = toFixed(result.physics.D_raw / 10, 2);
  const finalDiameterCm = formatCompact(result.physics.D_final / 10);
  const roundingDeltaCm = toFixed(result.physics.rounding_delta / 10, 2);
  const lengthM = formatCompact(result.physics.length_m);
  const filmWidthCm = formatCompact(input.filmWidthMm / 10);
  const baseHeightCm = formatCompact(result.rules.base_height_cm);
  const heightCm = formatCompact(result.rules.height_cm);
  const safetyAllowanceCm = formatCompact(result.rules.safety_allowance_cm);
  const baseLengthCm = toFixed(dimensions.length / 10, 1);
  const baseWidthCm = toFixed(dimensions.width / 10, 1);

  const physicsExplanation = `根据当前规格，单卷长度约为 ${lengthM} m，膜宽 ${filmWidthDisplay}，厚度 ${thicknessDisplay}，密度系数 ${densityDisplay}，推导单卷净重约为 ${netWeightDisplay}。系统计算得到单卷膜的理论外径约为 ${rawDiameterCm} cm，按照工艺规则向上取整后，建议按 ${finalDiameterCm} cm 参与纸箱尺寸计算，本次取整增加了 ${roundingDeltaCm} cm。`;

  const rulesExplanation = `膜宽为 ${filmWidthCm} cm，对应基础高度为 ${baseHeightCm} cm。按照当前工艺规则，纸箱高度需额外增加 ${safetyAllowanceCm} cm 冗余，因此建议成品箱高按 ${heightCm} cm 计算。`;

  const packingExplanation = `每箱 ${input.rollCount} 卷时，系统推荐采用 ${layout.a} x ${layout.b} 的摆放方式，即每排 ${layout.a} 卷，共 ${layout.b} 排。按修正后的单卷外径 ${finalDiameterCm} cm 计算，纸箱底面建议为 ${baseLengthCm} x ${baseWidthCm} cm，结合工艺箱高 ${heightCm} cm，最终建议纸箱尺寸为 ${dimensionsCm}。`;

  const optimizationExplanation = `本次布局选择策略综合考虑了接近正方形、空间利用率以及行业常见摆法偏好。在当前可选工业方案中，${layout.a} x ${layout.b} 更符合已确认的业务优先级，因此被选为推荐方案。`;

  return {
    inputDisplay: {
      filmLength: filmLengthDisplay,
      filmWidth: filmWidthDisplay,
      netWeight: netWeightDisplay,
      thickness: thicknessDisplay,
      density: densityDisplay,
      coreSpec:
        coreOption?.value === 'custom'
          ? `自定义 (${formatCompact(input.coreDiameterMm)} mm)`
          : (coreOption?.label ?? `${formatCompact(input.coreDiameterMm)} mm`)
    },
    physics: {
      D_raw: `${rawDiameterCm} cm`,
      D_final: `${finalDiameterCm} cm`,
      rounding_delta: `${roundingDeltaCm} cm`,
      length_m: `${lengthM} m`,
      net_weight: netWeightDisplay,
      explanation: physicsExplanation
    },
    rules: {
      base_height_cm: `${baseHeightCm} cm`,
      height_cm: `${heightCm} cm`,
      height_mm: `${heightCm} cm`,
      explanation: rulesExplanation
    },
    packing: {
      layout: `${layout.a} x ${layout.b}`,
      factors: { a: layout.a, b: layout.b },
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
      dimensions: dimensionsCm
    }
  };
}

function formatDebugCandidates(candidates) {
  return candidates.map((candidate) => ({
    layout: candidate.layout,
    factors: `${candidate.factors.a} x ${candidate.factors.b}`,
    total: toFixed(candidate.score.total, 2),
    businessPriorityPenalty: toFixed(candidate.score.businessPriorityPenalty, 2),
    squarenessPenalty: toFixed(candidate.score.squarenessPenalty, 2),
    longSidePenalty: toFixed(candidate.score.longSidePenalty, 2),
    manufacturingSimplicityPenalty: toFixed(candidate.score.manufacturingSimplicityPenalty, 2),
    industrialPreferenceBonus: toFixed(candidate.score.industrialPreferenceBonus, 2)
  }));
}

function baseExample(overrides) {
  return {
    filmLengthM: '300',
    filmWidthCm: '50',
    thicknessMicron: '12',
    coreSpec: '3in',
    customCoreDiameterMm: '',
    densityGPerCm3: '0.00916',
    rollCount: '6',
    ...overrides
  };
}

function toFixed(value, digits) {
  return Number(value).toFixed(digits);
}

function formatCompact(value) {
  return Number(value).toString();
}

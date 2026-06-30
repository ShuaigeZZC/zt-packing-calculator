export const CORE_WALL_ALLOWANCE_MM = 10;

export const CORE_OPTIONS = [
  { value: '1in', label: '1 inch (25.4 mm 内径)', shortLabel: '1 inch', coreInnerDiameterMm: 25.4 },
  { value: '1_5in', label: '1.5 inch (38.1 mm 内径)', shortLabel: '1.5 inch', coreInnerDiameterMm: 38.1 },
  { value: '2in', label: '2 inch (50.8 mm 内径)', shortLabel: '2 inch', coreInnerDiameterMm: 50.8 },
  { value: '2_25in', label: '2.25 inch (57.15 mm 内径)', shortLabel: '2.25 inch', coreInnerDiameterMm: 57.15 },
  { value: '2_5in', label: '2.5 inch (63.5 mm 内径)', shortLabel: '2.5 inch', coreInnerDiameterMm: 63.5 },
  { value: '3in', label: '3 inch (76.2 mm 内径)', shortLabel: '3 inch', coreInnerDiameterMm: 76.2 },
  { value: 'custom', label: '自定义纸管内径（mm）', shortLabel: '自定义纸管', coreInnerDiameterMm: null }
];

export function getCoreOption(value) {
  return CORE_OPTIONS.find((option) => option.value === value) ?? null;
}

export function buildCoreTubeModel({ coreSpec, customCoreInnerDiameterMm, coreWallAllowanceMm = CORE_WALL_ALLOWANCE_MM }) {
  const option = getCoreOption(coreSpec);
  const innerDiameterMm =
    option?.value === 'custom' ? Number(customCoreInnerDiameterMm) : Number(option?.coreInnerDiameterMm);
  const wallAllowanceMm = Number(coreWallAllowanceMm);
  const outerDiameterMm = innerDiameterMm + wallAllowanceMm;
  const label = option?.shortLabel ?? '未选择纸管';

  return {
    label,
    innerDiameterMm,
    wallAllowanceMm,
    outerDiameterMm,
    explanation: `当前选择 ${label} 纸管，行业规格 ${formatCoreNumber(
      innerDiameterMm
    )} mm 为内径。系统计算卷径时按 ${formatCoreNumber(outerDiameterMm)} mm 外径处理。`
  };
}

export function formatCoreNumber(value) {
  return Number(value).toString();
}

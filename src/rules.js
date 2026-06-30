export function applyRules({ rawDiameterMm, filmWidthMm }) {
  const finalDiameter = Math.ceil(rawDiameterMm);
  const baseHeightCm = filmWidthMm / 10;
  const safetyAllowanceCm = 3;
  const heightCm = baseHeightCm + safetyAllowanceCm;

  return {
    D_raw: rawDiameterMm,
    D_final: finalDiameter,
    rounding_delta: finalDiameter - rawDiameterMm,
    base_height_cm: baseHeightCm,
    safety_allowance_cm: safetyAllowanceCm,
    height_cm: heightCm,
    height_mm: heightCm * 10
  };
}

export function calculatePhysics(input) {
  const effectiveDensityGPerCm3 = input.densityGPerCm3 * 100;
  const filmWidthCm = input.filmWidthMm / 10;
  const thicknessMicron = input.thicknessMm * 1000;
  const rawDiameterSquared =
    input.coreDiameterMm ** 2 +
    (4000 * input.netWeightG) / (Math.PI * input.filmWidthMm * effectiveDensityGPerCm3);

  return {
    D_raw: Math.sqrt(rawDiameterSquared),
    length_m: input.netWeightG / (input.densityGPerCm3 * filmWidthCm * thicknessMicron)
  };
}

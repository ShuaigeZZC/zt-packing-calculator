export function scoreHistoricalMatch({ input, algorithmResult, record }) {
  const reasons = [];
  let score = 0;

  if (record.confidenceLevel === 'A') {
    score += 10;
    reasons.push('A类高可信参考');
  } else if (record.confidenceLevel === 'B') {
    score += 5;
    reasons.push('B类可参考记录');
  }

  if (isClose(record.filmWidthMm, input.filmWidthMm, 0)) {
    score += 30;
    reasons.push('膜宽一致');
  } else if (isWithinPercent(record.filmWidthMm, input.filmWidthMm, 0.08)) {
    score += 15;
    reasons.push('膜宽接近');
  }

  if (record.rollCount === input.rollCount) {
    score += 25;
    reasons.push('每箱卷数一致');
  }

  const inputWeightKg = input.netWeightG / 1000;
  if (isWithinPercent(record.netWeightKg, inputWeightKg, 0.05)) {
    score += 20;
    reasons.push('重量差异在 5% 内');
  } else if (isWithinPercent(record.netWeightKg, inputWeightKg, 0.2)) {
    score += 10;
    reasons.push('重量接近');
  }

  const algorithmBox = algorithmBoxCm(algorithmResult);
  const heightDiff = diff(record.box.heightCm, algorithmBox.heightCm);
  if (heightDiff !== null && heightDiff <= 2) {
    score += 10;
    reasons.push('历史箱高接近系统推荐箱高');
  }

  const baseDiff = averageBaseDifference(record.box, algorithmBox);
  if (baseDiff !== null && baseDiff <= 3) {
    score += 10;
    reasons.push('历史底面尺寸接近系统推荐');
  }

  if (/异常|低于理论/.test(record.comparisonStatus)) {
    score -= 50;
    reasons.push('历史记录带异常提示');
  } else if (record.comparisonStatus) {
    reasons.push(record.comparisonStatus);
  }

  return {
    score,
    reasons,
    sizeDifference: describeSizeDifference(record.box, algorithmBox)
  };
}

export function algorithmBoxCm(algorithmResult) {
  const box = algorithmResult.packing.box_dimensions_mm;
  return {
    lengthCm: box.length / 10,
    widthCm: box.width / 10,
    heightCm: box.height / 10
  };
}

function averageBaseDifference(historyBox, algorithmBox) {
  const historyBase = sortedPair(historyBox.lengthCm, historyBox.widthCm);
  const algorithmBase = sortedPair(algorithmBox.lengthCm, algorithmBox.widthCm);
  if (!historyBase || !algorithmBase) {
    return null;
  }

  return (Math.abs(historyBase[0] - algorithmBase[0]) + Math.abs(historyBase[1] - algorithmBase[1])) / 2;
}

function describeSizeDifference(historyBox, algorithmBox) {
  const length = signedDifference(historyBox.lengthCm, algorithmBox.lengthCm);
  const width = signedDifference(historyBox.widthCm, algorithmBox.widthCm);
  const height = signedDifference(historyBox.heightCm, algorithmBox.heightCm);

  return {
    lengthCm: length,
    widthCm: width,
    heightCm: height,
    summary: `历史箱规相对系统推荐：长 ${formatSigned(length)} cm，宽 ${formatSigned(width)} cm，高 ${formatSigned(
      height
    )} cm`
  };
}

function signedDifference(historyValue, algorithmValue) {
  if (!Number.isFinite(historyValue) || !Number.isFinite(algorithmValue)) {
    return null;
  }

  return Number((historyValue - algorithmValue).toFixed(1));
}

function formatSigned(value) {
  if (value === null) {
    return '缺失';
  }

  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function sortedPair(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return null;
  }

  return [a, b].sort((left, right) => left - right);
}

function isClose(left, right, tolerance) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function isWithinPercent(left, right, percent) {
  return Number.isFinite(left) && Number.isFinite(right) && right > 0 && Math.abs(left - right) / right <= percent;
}

function diff(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }

  return Math.abs(left - right);
}

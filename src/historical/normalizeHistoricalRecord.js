import { classifyHistoricalRecord } from './classifyHistoricalRecord.js';

export function normalizeHistoricalRecord(record, index = 0) {
  const classification = classifyHistoricalRecord(record);
  const box = record?.box ?? {};

  return {
    id: stringOrFallback(record?.id, `historical-${index + 1}`),
    confidenceLevel: classification.level,
    usableInReferencePanel: classification.usableInReferencePanel,
    classificationReason: classification.reason,
    customer: stringOrFallback(record?.customer, '未知客户'),
    source: stringOrFallback(record?.source, ''),
    filmWidthMm: numberOrNull(record?.filmWidthMm),
    thicknessMm: numberOrNull(record?.thicknessMm),
    lengthM: numberOrNull(record?.lengthM),
    netWeightKg: numberOrNull(record?.netWeightKg),
    coreDiameterMm: numberOrNull(record?.coreDiameterMm),
    rollCount: integerOrNull(record?.rollCount),
    box: {
      lengthCm: numberOrNull(box.lengthCm),
      widthCm: numberOrNull(box.widthCm),
      heightCm: numberOrNull(box.heightCm)
    },
    comparisonStatus: stringOrFallback(record?.comparisonStatus, ''),
    reasonText: stringOrFallback(record?.reasonText, ''),
    raw: record
  };
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function stringOrFallback(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

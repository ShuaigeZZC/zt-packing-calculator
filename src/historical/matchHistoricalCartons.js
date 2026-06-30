import { normalizeHistoricalRecord } from './normalizeHistoricalRecord.js';
import { scoreHistoricalMatch } from './scoreHistoricalMatch.js';

export function matchHistoricalCartons({ input, algorithmResult, records = [], limit = 3 }) {
  return records
    .map((record, index) => normalizeHistoricalRecord(record, index))
    .filter((record) => record.usableInReferencePanel)
    .map((record) => {
      const score = scoreHistoricalMatch({ input, algorithmResult, record });
      return {
        ...record,
        score: score.score,
        reasons: score.reasons,
        sizeDifference: score.sizeDifference,
        displayReason: buildDisplayReason(score.reasons)
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function buildDisplayReason(reasons) {
  if (!reasons.length) {
    return '字段较少，仅按可用信息作为参考。';
  }

  return `${reasons.slice(0, 3).join('，')}，因此作为参考案例展示。`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const historicalData = JSON.parse(
  readFileSync(new URL('../src/data/historicalCartonReference.json', import.meta.url), 'utf8')
);

test('generated quality summary preserves Excel confidence counts', () => {
  assert.equal(historicalData.qualitySummary.totalRecords, 283);
  assert.deepEqual(historicalData.qualitySummary.counts, {
    A: 62,
    B: 83,
    C: 76,
    D: 62
  });
  assert.equal(historicalData.qualitySummary.referenceEligibleCount, 145);
  assert.equal(historicalData.qualitySummary.historicalReferenceCount, 76);
  assert.equal(historicalData.qualitySummary.anomalyCount, 138);
});

test('generated business reference records are A/B only', () => {
  const levels = new Set(historicalData.referenceRecords.map((record) => record.confidenceLevel));

  assert.deepEqual([...levels].sort(), ['A', 'B']);
  assert.equal(historicalData.referenceRecords.length, historicalData.qualitySummary.historicalReferenceCount);
});

test('generated anomaly records stay outside the business reference panel', () => {
  const referenceIds = new Set(historicalData.referenceRecords.map((record) => record.id));

  assert.equal(historicalData.anomalyRecords.length, historicalData.qualitySummary.anomalyCount);
  assert.ok(historicalData.anomalyRecords.every((record) => record.confidenceLevel === 'C' || record.confidenceLevel === 'D'));
  assert.ok(historicalData.anomalyRecords.every((record) => !referenceIds.has(record.id)));
});

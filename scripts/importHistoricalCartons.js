import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const workbookPath = resolveWorkbookPath();
const outputPath = resolve('src/data/historicalCartonReference.json');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false
});
const zip = await JSZip.loadAsync(readFileSync(workbookPath));
const sharedStrings = await readSharedStrings();
const sheetPaths = await readSheetPaths();

const referenceRows = await readSheet('历史参考库');
const qualityRows = await readSheet('可信度分级表');
const anomalyRows = await readSheet('疑似异常池');
const fieldDictionaryRows = await readSheet('字段字典');

const referenceRecords = referenceRows
  .map((row, index) => normalizeReferenceRow(row, index, '历史参考库'))
  .filter((record) => record.confidenceLevel === 'A' || record.confidenceLevel === 'B');

const anomalyRecords = anomalyRows.map((row, index) => normalizeDetailedRow(row, index, '疑似异常池'));

const data = {
  generatedAt: new Date().toISOString(),
  sourceWorkbook: basename(workbookPath),
  qualitySummary: buildQualitySummary(qualityRows, anomalyRows, referenceRecords),
  referenceRecords,
  anomalyRecords,
  fieldDictionary: fieldDictionaryRows.map((row) => ({
    field: stringValue(row['字段']),
    meaning: stringValue(row['含义']),
    note: stringValue(row['备注'])
  }))
};

mkdirSync(resolve('src/data'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      output: outputPath,
      referenceRecords: referenceRecords.length,
      anomalyRecords: anomalyRecords.length,
      qualitySummary: data.qualitySummary
    },
    null,
    2
  )
);

function resolveWorkbookPath() {
  const dataDirectory = resolve('data');
  const workbookName = readdirSync(dataDirectory).find((name) => name.toLowerCase().endsWith('.xlsx'));
  if (!workbookName) {
    throw new Error('missing .xlsx workbook in data directory');
  }

  return resolve(dataDirectory, workbookName);
}

async function readSharedStrings() {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) {
    return [];
  }

  const document = parseXml(await file.async('text'));
  return asArray(document.sst?.si).map(readStringItem);
}

async function readSheetPaths() {
  const workbookDocument = parseXml(await zip.file('xl/workbook.xml').async('text'));
  const relationshipsDocument = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('text'));
  const relationships = new Map(
    asArray(relationshipsDocument.Relationships?.Relationship).map((relationship) => [
      relationship['@_Id'],
      workbookTargetToZipPath(relationship['@_Target'])
    ])
  );

  return new Map(
    asArray(workbookDocument.workbook?.sheets?.sheet).map((sheet) => [
      sheet['@_name'],
      relationships.get(sheet['@_id'])
    ])
  );
}

async function readSheet(sheetName) {
  const sheetPath = sheetPaths.get(sheetName);
  const file = sheetPath ? zip.file(sheetPath) : null;
  if (!file) {
    throw new Error(`missing sheet: ${sheetName}`);
  }

  const document = parseXml(await file.async('text'));
  const rows = sheetRowsToValues(asArray(document.worksheet?.sheetData?.row));
  return rowsToObjects(rows, sheetName);
}

function parseXml(xml) {
  return parser.parse(xml);
}

function workbookTargetToZipPath(target) {
  const cleaned = stringValue(target).replace(/^\/+/, '');
  return cleaned.startsWith('xl/') ? cleaned : `xl/${cleaned}`;
}

function sheetRowsToValues(rows) {
  const output = [];

  for (const row of rows) {
    const rowIndex = integerValue(row['@_r']) ?? output.length + 1;
    const values = [];

    for (const cell of asArray(row.c)) {
      const columnIndex = cellColumnIndex(cell['@_r']);
      values[columnIndex] = readCellValue(cell);
    }

    output[rowIndex - 1] = values;
  }

  return output.filter(Boolean);
}

function rowsToObjects(rows, sheetName) {
  const headers = (rows[0] ?? []).map((header) => stringValue(header));
  if (!headers.length) {
    throw new Error(`missing header row: ${sheetName}`);
  }

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => stringValue(cell) !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function readCellValue(cell) {
  const type = cell['@_t'];

  if (type === 's') {
    return sharedStrings[Number(textValue(cell.v))] ?? '';
  }

  if (type === 'inlineStr') {
    return readStringItem(cell.is);
  }

  return textValue(cell.v);
}

function readStringItem(item) {
  if (!item) {
    return '';
  }

  if (item.t !== undefined) {
    return textValue(item.t);
  }

  return asArray(item.r)
    .map((run) => textValue(run.t))
    .join('');
}

function textValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return stringValue(value['#text']);
  }

  return stringValue(value);
}

function cellColumnIndex(cellRef) {
  const letters = stringValue(cellRef).match(/[A-Z]+/i)?.[0] ?? 'A';
  return letters
    .toUpperCase()
    .split('')
    .reduce((column, letter) => column * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function normalizeReferenceRow(row, index, sheetName) {
  const filmWidthMm = numberValue(row['膜宽mm']);
  const box = parseBoxSpec(row['历史箱规cm'], filmWidthMm);
  const algorithmBox = parseBoxSpec(row['算法理论箱规cm'], filmWidthMm);

  return {
    id: `${sheetName}-${index + 2}`,
    confidenceLevel: stringValue(row['参考等级']),
    recordCount: integerValue(row['记录数']),
    customer: stringValue(row['客户示例']),
    source: stringValue(row['来源示例']),
    filmWidthMm,
    thicknessMm: numberValue(row['厚度mm']),
    netWeightKg: numberValue(row['有效重量kg']),
    coreDiameterMm: numberValue(row['纸管mm']),
    rollCount: integerValue(row['每箱卷数']),
    box,
    boxText: stringValue(row['历史箱规cm']),
    algorithmBox,
    algorithmBoxText: stringValue(row['算法理论箱规cm']),
    volumeRatio: numberValue(row['体积比中位数']),
    comparisonStatus: stringValue(row['主要状态']),
    reasonText: stringValue(row['建议用途'])
  };
}

function normalizeDetailedRow(row, index, sheetName) {
  const filmWidthMm = numberValue(row['膜宽mm']);
  return {
    id: `${sheetName}-${index + 2}`,
    confidenceLevel: stringValue(row['等级']),
    confidenceName: stringValue(row['等级名称']),
    confidenceScore: numberValue(row['可信度分']),
    customer: stringValue(row['客户']),
    source: `${stringValue(row['来源Sheet'])}!${stringValue(row['行号'])}`,
    filmWidthMm,
    thicknessMm: numberValue(row['厚度mm']),
    lengthM: numberValue(row['长度m']),
    netWeightKg: numberValue(row['有效重量kg']),
    coreDiameterMm: numberValue(row['纸管mm']),
    rollCount: integerValue(row['每箱卷数']),
    box: parseBoxColumns(row, filmWidthMm),
    boxText: stringValue(row['纸箱原文']),
    algorithmBoxText: stringValue(row['算法理论箱规cm']),
    comparisonStatus: stringValue(row['比较状态']),
    missingFields: stringValue(row['缺失字段']),
    reasonText: stringValue(row['分级原因'])
  };
}

function buildQualitySummary(rows, anomalyRowsForCount, records) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of rows) {
    const level = stringValue(row['等级']);
    if (Object.hasOwn(counts, level)) {
      counts[level] += 1;
    }
  }

  return {
    totalRecords: rows.length,
    counts,
    referenceEligibleCount: counts.A + counts.B,
    historicalReferenceCount: records.length,
    anomalyCount: anomalyRowsForCount.length
  };
}

function parseBoxColumns(row, filmWidthMm) {
  const text = [row['箱长cm'], row['箱宽cm'], row['箱高cm']]
    .map((value) => numberValue(value))
    .filter((value) => value !== null)
    .join(' × ');
  return parseBoxSpec(text, filmWidthMm);
}

function parseBoxSpec(value, filmWidthMm) {
  const numbers = String(value ?? '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((number) => Number.isFinite(number));

  if (!numbers || numbers.length < 3) {
    return { lengthCm: null, widthCm: null, heightCm: null };
  }

  const expectedHeight = Number.isFinite(filmWidthMm) ? filmWidthMm / 10 + 3 : null;
  const heightIndex =
    expectedHeight === null
      ? 2
      : numbers.reduce((bestIndex, number, index) => {
          return Math.abs(number - expectedHeight) < Math.abs(numbers[bestIndex] - expectedHeight) ? index : bestIndex;
        }, 0);
  const heightCm = numbers[heightIndex];
  const base = numbers.filter((_, index) => index !== heightIndex);

  return {
    lengthCm: base[0] ?? null,
    widthCm: base[1] ?? null,
    heightCm
  };
}

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerValue(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function stringValue(value) {
  return String(value ?? '').trim();
}

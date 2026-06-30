export function classifyHistoricalRecord(record) {
  const level = String(record?.confidenceLevel ?? record?.level ?? '').trim().toUpperCase();

  if (level === 'A' || level === 'B') {
    return {
      level,
      usableInReferencePanel: true,
      reason: level === 'A' ? '高可信参考' : '可参考但不可自动采用'
    };
  }

  if (level === 'C') {
    return {
      level,
      usableInReferencePanel: false,
      reason: '疑似异常，仅进入异常池'
    };
  }

  if (level === 'D') {
    return {
      level,
      usableInReferencePanel: false,
      reason: '禁止进入推荐，仅保留原始索引'
    };
  }

  return {
    level: '',
    usableInReferencePanel: false,
    reason: '缺少可信度等级'
  };
}

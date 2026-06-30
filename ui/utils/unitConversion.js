export function kgToG(value) {
  return Number(value) * 1000;
}

export function micronToMm(value) {
  return Number(value) / 1000;
}

export function mmToCm(value) {
  return Number(value) / 10;
}

export function formatFixed(value, digits) {
  return Number(value).toFixed(digits);
}

export function formatCompact(value) {
  return Number(value).toString();
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

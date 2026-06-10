export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

export function slugifyZoneName(name) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return base || `custom-${Date.now()}`;
}


export function formatNumber(value) {
  return Math.round(value).toLocaleString();
}

export function formatArea(sqft) {
  if (sqft >= 43560) {
    return `${(sqft / 43560).toFixed(2)} acres`;
  }
  return `${formatNumber(sqft)} sq ft`;
}

export function formatLength(feet) {
  if (feet >= 5280) {
    return `${(feet / 5280).toFixed(2)} mi`;
  }
  return `${formatNumber(feet)} ft`;
}

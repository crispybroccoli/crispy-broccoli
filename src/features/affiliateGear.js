import {affiliateProducts} from '../data/affiliateProducts.js';
import {escapeHtml} from '../utils/format.js';

export function normalizeText(value) {
  return String(value || '').toLowerCase();
}

export function productSearchText(product) {
  return normalizeText(`${product.category} ${product.priority} ${product.productType} ${product.searchPhrase} ${product.rationale} ${product.specNotes} ${product.notes}`);
}

export function getAffiliateCategories() {
  return Array.from(new Set(affiliateProducts.map((product) => product.category))).sort();
}

export function priorityRank(priority) {
  return {Critical: 0, High: 1, Medium: 2, Low: 3}[priority] ?? 9;
}

export function getAffiliateMatches(row, limit = 3) {
  const haystack = normalizeText(`${row.name} ${row.linked} ${row.source}`);
  const categoryMap = {
    Comms: 'Communication',
    Medical: 'Medical',
    Security: 'Security',
    Power: 'Power',
    Water: 'Water',
    Food: 'Food',
  };
  return affiliateProducts
    .map((product) => {
      const text = productSearchText(product);
      let score = 0;
      if (normalizeText(product.category) === normalizeText(row.linked)) score += 7;
      if (normalizeText(product.category) === normalizeText(categoryMap[row.linked])) score += 7;
      normalizeText(row.name).split(/\W+/).filter((word) => word.length > 3).forEach((word) => {
        if (text.includes(word)) score += 2;
      });
      normalizeText(row.linked).split(/\W+/).filter((word) => word.length > 3).forEach((word) => {
        if (text.includes(word)) score += 1;
      });
      if (text.includes(haystack)) score += 3;
      return {product, score};
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || priorityRank(a.product.priority) - priorityRank(b.product.priority))
    .slice(0, limit)
    .map((match) => match.product);
}
export function renderAffiliateCategoryOptions() {
  const select = document.querySelector('#affiliateCategoryFilter');
  if (!select) return;
  select.innerHTML = '<option value="all">All categories</option>' + getAffiliateCategories()
    .map((category) => `<option>${escapeHtml(category)}</option>`)
    .join('');
}

export function renderAffiliateGear() {
  const list = document.querySelector('#affiliateGearList');
  if (!list) return;
  const query = normalizeText(document.querySelector('#affiliateSearchInput')?.value || '');
  const category = document.querySelector('#affiliateCategoryFilter')?.value || 'all';
  const priority = document.querySelector('#affiliatePriorityFilter')?.value || 'all';
  const products = affiliateProducts.filter((product) => (
    (category === 'all' || product.category === category) &&
    (priority === 'all' || product.priority === priority) &&
    (!query || productSearchText(product).includes(query))
  )).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.category.localeCompare(b.category));
  document.querySelector('#affiliateProductCount').textContent = `${products.length} products`;
  list.innerHTML = products.map((product) => `
    <article class="affiliate-card">
      <div>
        <span>${escapeHtml(product.category)} - ${escapeHtml(product.priority)}</span>
        <strong>${escapeHtml(product.productType)}</strong>
        <p>${escapeHtml(product.rationale)}</p>
        <small>${escapeHtml(product.specNotes)}</small>
      </div>
      <a href="${escapeHtml(product.affiliateLink)}" target="_blank" rel="noreferrer sponsored">Open affiliate search</a>
    </article>
  `).join('') || '<div class="empty-inspector">No products match the current filters.</div>';
}

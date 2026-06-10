import {escapeHtml} from '../utils/format.js';

export function createPlanListHelpers({makeId, setStatus, scheduleAutosave}) {
  function addPlanEntry(plan, collectionKey, fields, renderFn, label = 'Entry') {
    const entry = {id: makeId(collectionKey)};
    let hasContent = false;
    fields.forEach(({name, selector}) => {
      const element = document.querySelector(selector);
      entry[name] = element.type === 'number' ? Number(element.value) || 0 : element.value.trim();
      if (entry[name]) hasContent = true;
    });
    if (!hasContent) {
      setStatus(`Enter ${label.toLowerCase()} details before adding.`);
      return;
    }
    plan[collectionKey].push(entry);
    fields.forEach(({selector}) => {
      document.querySelector(selector).value = '';
    });
    renderFn();
    scheduleAutosave();
    setStatus(`${label} added.`);
  }

  function renderPlanList(plan, collectionKey, containerSelector, fields, renderFn) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const items = plan[collectionKey] || [];
    container.innerHTML = items.map((item) => `
      <article class="comms-card">
        ${fields.map((field) => `
          <label>${field.label}
            <input data-plan-field="${field.name}" data-plan-id="${item.id}" data-plan-collection="${collectionKey}" value="${escapeHtml(item[field.name] || '')}" />
          </label>
        `).join('')}
        <button class="danger-lite" data-plan-remove="${item.id}" data-plan-collection="${collectionKey}">Remove</button>
      </article>
    `).join('') || '<div class="empty-inspector">No entries yet.</div>';

    container.querySelectorAll('[data-plan-field]').forEach((field) => {
      field.addEventListener('input', (event) => {
        const item = plan[event.target.dataset.planCollection].find((entry) => entry.id === event.target.dataset.planId);
        if (!item) return;
        item[event.target.dataset.planField] = event.target.value;
        scheduleAutosave();
      });
    });
    container.querySelectorAll('[data-plan-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const items = plan[button.dataset.planCollection] || [];
        const index = items.findIndex((entry) => entry.id === button.dataset.planRemove);
        if (index >= 0) items.splice(index, 1);
        renderFn();
        scheduleAutosave();
      });
    });
  }

  return {addPlanEntry, renderPlanList};
}

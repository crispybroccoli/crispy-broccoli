import {escapeHtml, formatNumber} from '../utils/format.js';

const taskColumns = ['Backlog', 'This Month', 'In Progress', 'Done'];

export function createTaskBoard({
  projectPhases,
  scenarioDefinitions,
  makeId,
  setStatus,
  scheduleAutosave,
  updateDashboard,
  renderShoppingList,
}) {
  function normalizeTaskColumn(task) {
    if (taskColumns.includes(task.column)) return task.column;
    if (task.status === 'Done') return 'Done';
    if (task.status === 'Active') return 'In Progress';
    if (task.phase === '30 days' || task.phase === 'Immediate') return 'This Month';
    return 'Backlog';
  }

  function ensureTaskIds() {
    projectPhases.forEach((task) => {
      if (!task.id) task.id = makeId('task');
    });
  }

  function renderTaskScenarioOptions() {
    const select = document.querySelector('#taskScenarioInput');
    if (!select) return;
    select.innerHTML = '<option value="">No scenario</option>' + Object.entries(scenarioDefinitions)
      .map(([key, scenario]) => `<option value="${key}">${scenario.label}</option>`)
      .join('');
  }

  function renderTaskBoard() {
    const board = document.querySelector('#taskBoard');
    if (!board) return;
    ensureTaskIds();
    board.innerHTML = taskColumns.map((column) => {
      const tasks = projectPhases
        .map((task, index) => ({...task, index, column: normalizeTaskColumn(task)}))
        .filter((task) => task.column === column);
      const total = tasks.reduce((sum, task) => sum + (Number(task.cost) || 0), 0);
      return `
        <section class="task-column">
          <div class="task-column-head">
            <h3>${column}</h3>
            <span>${tasks.length} / $${formatNumber(total)}</span>
          </div>
          <div class="task-card-list">
            ${tasks.map((task) => renderTaskCard(task)).join('') || '<div class="empty-inspector">No tasks here.</div>'}
          </div>
        </section>
      `;
    }).join('');

    board.querySelectorAll('[data-task-field]').forEach((field) => {
      field.addEventListener('input', (event) => {
        const task = projectPhases[Number(event.target.dataset.taskIndex)];
        const key = event.target.dataset.taskField;
        task[key] = key === 'cost' ? Number(event.target.value) || 0 : event.target.value;
        if (key === 'column') {
          task.status = event.target.value === 'Done' ? 'Done' : event.target.value === 'In Progress' ? 'Active' : 'Planned';
        }
        if (key === 'task' || key === 'zone' || key === 'inventory') {
          scheduleAutosave();
        } else {
          updateDashboard();
        }
        if (document.querySelector('#budget-shopping')?.classList.contains('active')) renderShoppingList();
      });
    });

    board.querySelectorAll('[data-remove-task]').forEach((button) => {
      button.addEventListener('click', () => {
        projectPhases.splice(Number(button.dataset.removeTask), 1);
        updateDashboard();
        setStatus('Task removed.');
      });
    });
  }

  function renderTaskCard(task) {
    const scenarioOptions = '<option value="">No scenario</option>' + Object.entries(scenarioDefinitions)
      .map(([key, scenario]) => `<option value="${key}" ${task.scenario === key ? 'selected' : ''}>${scenario.label}</option>`)
      .join('');
    return `
      <article class="task-card">
        <textarea data-task-field="task" data-task-index="${task.index}">${escapeHtml(task.task)}</textarea>
        <div class="task-meta-grid">
          <label>Column
            <select data-task-field="column" data-task-index="${task.index}">
              ${taskColumns.map((column) => `<option ${task.column === column ? 'selected' : ''}>${column}</option>`).join('')}
            </select>
          </label>
          <label>Cost
            <input type="number" min="0" step="25" data-task-field="cost" data-task-index="${task.index}" value="${Number(task.cost) || 0}" />
          </label>
          <label>Zone
            <input data-task-field="zone" data-task-index="${task.index}" value="${escapeHtml(task.zone || '')}" />
          </label>
          <label>Inventory
            <input data-task-field="inventory" data-task-index="${task.index}" value="${escapeHtml(task.inventory || '')}" />
          </label>
          <label>Scenario
            <select data-task-field="scenario" data-task-index="${task.index}">${scenarioOptions}</select>
          </label>
        </div>
        <button class="danger-lite" data-remove-task="${task.index}">Remove</button>
      </article>
    `;
  }

  function addTaskCard() {
    const title = document.querySelector('#taskTitleInput').value.trim();
    if (!title) {
      setStatus('Enter a task title first.');
      return;
    }
    const column = document.querySelector('#taskColumnInput').value;
    projectPhases.push({
      phase: column,
      column,
      task: title,
      cost: Number(document.querySelector('#taskCostInput').value) || 0,
      status: column === 'Done' ? 'Done' : column === 'In Progress' ? 'Active' : 'Planned',
      zone: document.querySelector('#taskZoneInput').value.trim(),
      inventory: document.querySelector('#taskInventoryInput').value.trim(),
      scenario: document.querySelector('#taskScenarioInput').value,
      id: makeId('task'),
    });
    ['#taskTitleInput', '#taskCostInput', '#taskZoneInput', '#taskInventoryInput'].forEach((selector) => {
      document.querySelector(selector).value = '';
    });
    updateDashboard();
    setStatus('Task added.');
  }

  return {
    addTaskCard,
    ensureTaskIds,
    normalizeTaskColumn,
    renderTaskBoard,
    renderTaskScenarioOptions,
  };
}

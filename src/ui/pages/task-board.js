export const taskBoardPage = `    <section class="page" id="task-board">
      <header class="topbar">
        <div>
          <p class="eyebrow">Task Board</p>
          <h2>Build plan kanban</h2>
        </div>
        <div class="plan-actions">
          <button id="addTaskCard">Add Task</button>
        </div>
      </header>
      <section class="task-toolbar">
        <input id="taskTitleInput" placeholder="Task title" />
        <select id="taskColumnInput">
          <option value="Backlog">Backlog</option>
          <option value="This Month">This Month</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
        <input id="taskCostInput" type="number" min="0" step="25" placeholder="Cost" />
        <input id="taskZoneInput" placeholder="Linked zone" />
        <input id="taskInventoryInput" placeholder="Linked inventory" />
        <select id="taskScenarioInput"></select>
      </section>
      <div id="taskBoard" class="task-board"></div>
    </section>

`;

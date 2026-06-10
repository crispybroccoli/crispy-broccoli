export const maintenanceCalendarPage = `    <section class="page" id="maintenance-calendar">
      <header class="topbar">
        <div>
          <p class="eyebrow">Maintenance / Rotation Calendar</p>
          <h2>Keep supplies and systems current</h2>
        </div>
        <div class="plan-actions">
          <button id="addMaintenanceItem">Add Item</button>
        </div>
      </header>
      <section class="budget-summary">
        <article>
          <span>Due now</span>
          <strong id="maintenanceDueNow">0</strong>
        </article>
        <article>
          <span>Next 30 days</span>
          <strong id="maintenanceDueSoon">0</strong>
        </article>
        <article>
          <span>Total tracked</span>
          <strong id="maintenanceTotal">0</strong>
        </article>
      </section>
      <section class="maintenance-toolbar">
        <input id="maintenanceTitleInput" placeholder="Task, item, or cycle" />
        <select id="maintenanceCategoryInput">
          <option>Food</option>
          <option>Water</option>
          <option>Power</option>
          <option>Comms</option>
          <option>Garden</option>
          <option>Livestock</option>
          <option>Medical</option>
          <option>Tools</option>
        </select>
        <input id="maintenanceDueInput" type="date" />
        <input id="maintenanceIntervalInput" type="number" min="0" step="1" placeholder="Repeat days" />
        <input id="maintenanceNotesInput" placeholder="Notes" />
      </section>
      <section class="budget-filters">
        <select id="maintenanceCategoryFilter">
          <option value="all">All categories</option>
          <option>Food</option>
          <option>Water</option>
          <option>Power</option>
          <option>Comms</option>
          <option>Garden</option>
          <option>Livestock</option>
          <option>Medical</option>
          <option>Tools</option>
        </select>
        <select id="maintenanceStatusFilter">
          <option value="all">All status</option>
          <option value="due">Due now</option>
          <option value="soon">Next 30 days</option>
          <option value="later">Later</option>
        </select>
      </section>
      <div id="maintenanceList" class="maintenance-list"></div>
    </section>

`;

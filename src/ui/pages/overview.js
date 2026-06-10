export const overviewPage = `    <section class="page active" id="overview">
      <header class="topbar">
        <div>
          <p class="eyebrow">Command View</p>
          <h2>Current posture and next moves</h2>
        </div>
        <div class="plan-actions">
          <span id="overviewSaveStatus">Autosave on</span>
          <button id="savePlan">Save Plan</button>
          <button id="loadPlan">Load Plan</button>
          <button id="exportJson">Export JSON</button>
          <button id="importJson">Import JSON</button>
          <button id="exportReport">Export Report</button>
          <button id="resetPlan" class="danger-lite">Reset Plan</button>
        </div>
      </header>
      <section class="quick-start">
        <div>
          <p class="eyebrow">Start Here</p>
          <h3>Most-used work areas</h3>
        </div>
        <div class="module-grid">
          <button data-dashboard-link="homestead"><strong>Property Map</strong><span>GIS, bases, zones, risks</span></button>
          <button data-dashboard-link="household-profiles"><strong>Profiles</strong><span>People, pets, requirements</span></button>
          <button data-dashboard-link="preparedness"><strong>Inventory</strong><span>Supplies and gaps</span></button>
          <button data-dashboard-link="scenario-planner"><strong>Scenarios</strong><span>Stress-test the plan</span></button>
          <button data-dashboard-link="task-board"><strong>Tasks</strong><span>Kanban execution</span></button>
          <button data-dashboard-link="budget-shopping"><strong>Budget</strong><span>Shopping from gaps</span></button>
          <button data-dashboard-link="evacuation-planner"><strong>Evacuation</strong><span>Routes and go-bags</span></button>
          <button data-dashboard-link="offline-library"><strong>Offline Library</strong><span>ZIM reader and notes</span></button>
        </div>
      </section>
      <div class="overview-grid">
        <section class="metric">
          <span>Mapped zones</span>
          <strong id="zoneCount">0</strong>
        </section>
        <section class="metric">
          <span>Prep gaps</span>
          <strong id="gapCount">0</strong>
        </section>
        <section class="metric">
          <span>Critical categories</span>
          <strong id="criticalCount">0</strong>
        </section>
      </div>
      <section class="timeline">
        <h3>Recommended Build Order</h3>
        <ol id="buildOrder"></ol>
      </section>
      <section class="timeline">
        <h3>Generated Recommendations</h3>
        <div id="recommendationEngine" class="recommendation-grid"></div>
      </section>
      <section class="timeline">
        <h3>Project Phasing</h3>
        <div id="phasePlanner" class="phase-grid"></div>
      </section>
    </section>

`;

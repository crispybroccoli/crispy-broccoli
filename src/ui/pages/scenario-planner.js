export const scenarioPlannerPage = `    <section class="page" id="scenario-planner">
      <header class="topbar">
        <div>
          <p class="eyebrow">Scenario Planner</p>
          <h2>Stress-test the plan</h2>
        </div>
        <div class="plan-actions">
          <button id="applyScenarioRisks">Apply Risks</button>
          <button id="scenarioToTasks">Add Tasks</button>
        </div>
      </header>

      <div class="scenario-layout">
        <section class="scenario-picker">
          <div id="scenarioCards" class="scenario-grid"></div>
        </section>
        <aside class="scenario-output">
          <section class="design-panel">
            <div class="panel-title">
              <h3>Generated Gaps</h3>
              <span id="scenarioGapCount">0</span>
            </div>
            <div id="scenarioGaps" class="scenario-list"></div>
          </section>
          <section class="design-panel">
            <div class="panel-title">
              <h3>Map Concerns</h3>
              <span>zones</span>
            </div>
            <div id="scenarioMapConcerns" class="scenario-list"></div>
          </section>
          <section class="design-panel">
            <div class="panel-title">
              <h3>Inventory Priorities</h3>
              <span>supplies</span>
            </div>
            <div id="scenarioInventory" class="scenario-list"></div>
          </section>
          <section class="design-panel">
            <div class="panel-title">
              <h3>Scenario Tasks</h3>
              <span>actions</span>
            </div>
            <div id="scenarioTasks" class="scenario-list"></div>
          </section>
        </aside>
      </div>
    </section>

`;

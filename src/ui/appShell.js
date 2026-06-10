import {homesteadPage} from './pages/homestead.js';
import {preparednessPage} from './pages/preparedness.js';
import {overviewPage} from './pages/overview.js';
import {offlineLibraryPage} from './pages/offline-library.js';
import {scenarioPlannerPage} from './pages/scenario-planner.js';
import {taskBoardPage} from './pages/task-board.js';
import {budgetShoppingPage} from './pages/budget-shopping.js';
import {affiliateGearPage} from './pages/affiliate-gear.js';
import {maintenanceCalendarPage} from './pages/maintenance-calendar.js';
import {documentsVaultPage} from './pages/documents-vault.js';
import {communicationsPlanPage} from './pages/communications-plan.js';
import {evacuationPlannerPage} from './pages/evacuation-planner.js';
import {skillsTrackerPage} from './pages/skills-tracker.js';
import {householdProfilesPage} from './pages/household-profiles.js';

export const appShellTemplate = `
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-mark">HR</span>
      <div>
        <h1>Homestead Ready</h1>
        <p>Preparedness command center v2</p>
      </div>
    </div>
    <nav class="tabs" aria-label="Command center pages">
      <div class="nav-group">
        <span>Command</span>
        <button class="tab active" data-tab="overview">Dashboard</button>
        <button class="tab" data-tab="homestead">Property Map</button>
        <button class="tab" data-tab="scenario-planner">Scenarios</button>
      </div>
      <div class="nav-group">
        <span>Readiness</span>
        <button class="tab" data-tab="household-profiles">Profiles</button>
        <button class="tab" data-tab="preparedness">Inventory</button>
        <button class="tab" data-tab="skills-tracker">Skills</button>
        <button class="tab" data-tab="maintenance-calendar">Maintenance</button>
      </div>
      <div class="nav-group">
        <span>Execution</span>
        <button class="tab" data-tab="task-board">Tasks</button>
        <button class="tab" data-tab="budget-shopping">Budget</button>
        <button class="tab" data-tab="affiliate-gear">Gear</button>
      </div>
      <div class="nav-group">
        <span>Emergency Ops</span>
        <button class="tab" data-tab="evacuation-planner">Evacuation</button>
        <button class="tab" data-tab="communications-plan">Comms</button>
        <button class="tab" data-tab="documents-vault">Documents</button>
        <button class="tab" data-tab="offline-library">Offline Library</button>
      </div>
    </nav>
    <section class="readiness">
      <div>
        <span>Readiness</span>
        <strong id="readinessScore">68%</strong>
      </div>
      <progress id="readinessProgress" max="100" value="68"></progress>
    </section>
    <section class="side-list">
      <h2>Priority Actions</h2>
      <div id="priorityActions" class="action-list"></div>
      <h2>Layout Summary</h2>
      <div id="zoneSummary" class="zone-summary"></div>
    </section>
  </aside>

  <main class="main">
    <div class="support-banner">
      <div class="global-plan-controls">
        <span id="autosaveStatus">Autosave on</span>
        <button id="globalSavePlan">Save</button>
        <button id="globalLoadPlan">Load</button>
        <button id="globalExportJson">Export JSON</button>
        <button id="globalImportJson">Import JSON</button>
        <button id="globalExportReport">Export</button>
        <button id="globalResetPlan" class="danger-lite">Reset</button>
        <input id="jsonImportInput" type="file" accept="application/json" hidden />
      </div>
      <div class="global-planning-controls">
        <label>People <input class="householdInput" type="number" min="1" max="20" value="4" /></label>
        <label>Days <input class="durationInput" type="number" min="1" max="3650" value="30" /></label>
      </div>
      <div class="support-link">
        <span>Support development</span>
        <a href="https://buymeacoffee.com/crispybroccoli" target="_blank" rel="noreferrer">Buy me a coffee</a>
      </div>
    </div>
${homesteadPage}${preparednessPage}${overviewPage}${offlineLibraryPage}${scenarioPlannerPage}${taskBoardPage}${budgetShoppingPage}${affiliateGearPage}${maintenanceCalendarPage}${documentsVaultPage}${communicationsPlanPage}${evacuationPlannerPage}${skillsTrackerPage}${householdProfilesPage}  </main>
`;

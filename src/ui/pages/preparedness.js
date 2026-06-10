export const preparednessPage = `    <section class="page" id="preparedness">
      <header class="topbar">
        <div>
          <p class="eyebrow">Supply Planning</p>
          <h2>Track every preparation facet</h2>
        </div>
        <div class="planning-controls compact">
          <label class="planning-input">
            People
            <input class="householdInput" type="number" min="1" max="20" value="4" />
          </label>
          <label class="planning-input">
            Days off grid
            <input class="durationInput" type="number" min="1" max="3650" value="30" />
          </label>
        </div>
      </header>
      <section class="prep-toolbar">
        <div>
          <strong id="prepCostTotal">$0</strong>
          <span>estimated gap cost</span>
        </div>
        <button id="undoPrep">Undo</button>
        <button id="redoPrep">Redo</button>
        <button id="fillMinimums">Fill Minimum Targets</button>
      </section>
      <div class="prep-grid" id="prepGrid"></div>
    </section>

`;

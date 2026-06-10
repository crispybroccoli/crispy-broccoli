export const budgetShoppingPage = `    <section class="page" id="budget-shopping">
      <header class="topbar">
        <div>
          <p class="eyebrow">Budget / Shopping List</p>
          <h2>Buy from gaps and project phases</h2>
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
      <section class="budget-summary">
        <article>
          <span>Buy now</span>
          <strong id="budgetBuyNow">$0</strong>
        </article>
        <article>
          <span>Buy later</span>
          <strong id="budgetBuyLater">$0</strong>
        </article>
        <article>
          <span>Line items</span>
          <strong id="budgetLineCount">0</strong>
        </article>
      </section>
      <section class="budget-filters">
        <select id="shoppingPriorityFilter">
          <option value="all">All priorities</option>
          <option value="High">High priority</option>
          <option value="Medium">Medium priority</option>
          <option value="Low">Low priority</option>
        </select>
        <select id="shoppingSourceFilter">
          <option value="all">All sources</option>
          <option value="Inventory gap">Inventory gaps</option>
          <option value="Project phase">Project phases</option>
        </select>
      </section>
      <div id="shoppingList" class="shopping-list"></div>
    </section>

`;

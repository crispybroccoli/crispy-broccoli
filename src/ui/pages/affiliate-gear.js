export const affiliateGearPage = `    <section class="page" id="affiliate-gear">
      <header class="topbar">
        <div>
          <p class="eyebrow">Recommended Gear</p>
          <h2>Preparedness product links</h2>
        </div>
        <div class="plan-actions">
          <span id="affiliateProductCount">0 products</span>
        </div>
      </header>
      <section class="budget-filters">
        <input id="affiliateSearchInput" placeholder="Search gear, rationale, or notes" />
        <select id="affiliateCategoryFilter"></select>
        <select id="affiliatePriorityFilter">
          <option value="all">All priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </section>
      <div class="affiliate-disclosure">
        Product links are affiliate search links from the imported workbook. Verify specs, reviews, seller, and current price before buying.
      </div>
      <div id="affiliateGearList" class="affiliate-grid"></div>
    </section>

`;

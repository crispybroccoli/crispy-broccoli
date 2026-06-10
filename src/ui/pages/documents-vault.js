export const documentsVaultPage = `    <section class="page" id="documents-vault">
      <header class="topbar">
        <div>
          <p class="eyebrow">Documents Vault</p>
          <h2>Offline records and reference files</h2>
        </div>
        <div class="plan-actions">
          <button id="addVaultDocument">Add Document</button>
        </div>
      </header>
      <section class="budget-summary">
        <article>
          <span>Total files</span>
          <strong id="vaultTotal">0</strong>
        </article>
        <article>
          <span>Renewal due</span>
          <strong id="vaultRenewalDue">0</strong>
        </article>
        <article>
          <span>Stored size</span>
          <strong id="vaultStorageSize">0 KB</strong>
        </article>
      </section>
      <section class="vault-toolbar">
        <input id="vaultTitleInput" placeholder="Document title" />
        <select id="vaultCategoryInput">
          <option>Insurance</option>
          <option>Property docs</option>
          <option>Medical info</option>
          <option>IDs</option>
          <option>Manuals</option>
          <option>Maps</option>
          <option>Radio frequencies</option>
          <option>Evacuation plans</option>
        </select>
        <select id="vaultSensitivityInput">
          <option>Normal</option>
          <option>Sensitive</option>
          <option>Critical</option>
        </select>
        <input id="vaultRenewalInput" type="date" />
        <input id="vaultLinkedInput" placeholder="Linked zone, task, or person" />
        <input id="vaultFileInput" type="file" accept="application/pdf,image/*" />
        <textarea id="vaultNotesInput" placeholder="Notes, copy location, radio channel, policy number, or evacuation detail"></textarea>
      </section>
      <section class="budget-filters">
        <select id="vaultCategoryFilter">
          <option value="all">All categories</option>
          <option>Insurance</option>
          <option>Property docs</option>
          <option>Medical info</option>
          <option>IDs</option>
          <option>Manuals</option>
          <option>Maps</option>
          <option>Radio frequencies</option>
          <option>Evacuation plans</option>
        </select>
        <select id="vaultSensitivityFilter">
          <option value="all">All sensitivity</option>
          <option>Normal</option>
          <option>Sensitive</option>
          <option>Critical</option>
        </select>
      </section>
      <div id="documentsVaultList" class="vault-list"></div>
    </section>

`;

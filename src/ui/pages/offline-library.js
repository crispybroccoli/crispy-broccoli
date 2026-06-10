export const offlineLibraryPage = `    <section class="page" id="offline-library">
      <header class="topbar">
        <div>
          <p class="eyebrow">Offline Knowledge</p>
          <h2>ZIM reader</h2>
        </div>
        <div class="plan-actions">
          <button id="openZimReader">Open Reader</button>
          <button id="refreshZimFrame">Refresh Embed</button>
        </div>
      </header>

      <div class="library-layout">
        <section class="library-main">
          <div class="library-toolbar">
            <div>
              <strong>ZIM Reader</strong>
              <span>Load your downloaded .zim files in the embedded reader.</span>
            </div>
            <a class="library-link-button" href="http://localhost:8080/" target="_blank" rel="noreferrer">Open in Browser</a>
          </div>
          <iframe id="zimFrame" title="ZIM Reader" src="http://localhost:8080/"></iframe>
        </section>

        <aside class="library-side">
          <section class="design-panel">
            <div class="panel-title">
              <h3>Small Starter Ideas</h3>
              <span>Optional</span>
            </div>
            <div id="libraryPacks" class="library-pack-list"></div>
          </section>

          <section class="design-panel">
            <div class="panel-title">
              <h3>My ZIM Notes</h3>
              <span>Optional</span>
            </div>
            <div class="library-save-form">
              <input id="libraryTitle" placeholder="Note title" />
              <input id="libraryUrl" placeholder="Article path or ZIM filename" />
              <select id="libraryLinkType">
                <option value="general">General</option>
                <option value="task">Task</option>
                <option value="inventory">Inventory</option>
                <option value="zone">Zone</option>
              </select>
              <input id="libraryLinkTarget" placeholder="Linked item name" />
              <textarea id="libraryNotes" placeholder="Short note"></textarea>
              <button id="saveLibraryLink" class="primary">Save Note</button>
            </div>
          </section>

          <section class="design-panel">
            <div class="panel-title">
              <h3>Saved Notes</h3>
              <span id="libraryCount">0</span>
            </div>
            <div id="savedLibraryLinks" class="saved-library-links"></div>
          </section>
        </aside>
      </div>
    </section>

`;

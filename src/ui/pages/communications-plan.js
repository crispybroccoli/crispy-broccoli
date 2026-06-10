export const communicationsPlanPage = `    <section class="page" id="communications-plan">
      <header class="topbar">
        <div>
          <p class="eyebrow">Communications Plan</p>
          <h2>Contacts, radio, rally, and messages</h2>
        </div>
        <div class="plan-actions">
          <button id="printCommsPlan">Print Plan</button>
        </div>
      </header>
      <section class="budget-summary">
        <article>
          <span>Radio entries</span>
          <strong id="commsRadioCount">0</strong>
        </article>
        <article>
          <span>Contacts</span>
          <strong id="commsContactCount">0</strong>
        </article>
        <article>
          <span>Rally points</span>
          <strong id="commsRallyCount">0</strong>
        </article>
      </section>

      <div class="comms-grid">
        <section class="comms-panel">
          <div class="panel-title">
            <h3>Radio Frequencies</h3>
            <button id="addRadioEntry">Add</button>
          </div>
          <div class="comms-form">
            <input id="radioNameInput" placeholder="Channel or purpose" />
            <input id="radioFrequencyInput" placeholder="Frequency / channel" />
            <input id="radioCallSignInput" placeholder="Call sign" />
            <input id="radioNotesInput" placeholder="Tone, privacy code, protocol" />
          </div>
          <div id="radioList" class="comms-list"></div>
        </section>

        <section class="comms-panel">
          <div class="panel-title">
            <h3>Family Contact Tree</h3>
            <button id="addContactEntry">Add</button>
          </div>
          <div class="comms-form">
            <input id="contactNameInput" placeholder="Name" />
            <input id="contactRoleInput" placeholder="Role / branch" />
            <input id="contactPrimaryInput" placeholder="Primary contact" />
            <input id="contactBackupInput" placeholder="Backup contact" />
          </div>
          <div id="contactList" class="comms-list"></div>
        </section>

        <section class="comms-panel">
          <div class="panel-title">
            <h3>Rally Points</h3>
            <button id="addRallyEntry">Add</button>
          </div>
          <div class="comms-form">
            <input id="rallyNameInput" placeholder="Name" />
            <input id="rallyLocationInput" placeholder="Location / address" />
            <input id="rallyTriggerInput" placeholder="When to use" />
            <input id="rallyNotesInput" placeholder="Route, cache, hazards" />
          </div>
          <div id="rallyList" class="comms-list"></div>
        </section>

        <section class="comms-panel">
          <div class="panel-title">
            <h3>Check-in Schedules</h3>
            <button id="addCheckInEntry">Add</button>
          </div>
          <div class="comms-form">
            <input id="checkInNameInput" placeholder="Schedule name" />
            <input id="checkInTimeInput" placeholder="Time / cadence" />
            <input id="checkInMethodInput" placeholder="Method" />
            <input id="checkInFallbackInput" placeholder="Fallback plan" />
          </div>
          <div id="checkInList" class="comms-list"></div>
        </section>

        <section class="comms-panel">
          <div class="panel-title">
            <h3>Emergency Broadcast Stations</h3>
            <button id="addBroadcastEntry">Add</button>
          </div>
          <div class="comms-form">
            <input id="broadcastNameInput" placeholder="Station / source" />
            <input id="broadcastFrequencyInput" placeholder="Frequency / URL" />
            <input id="broadcastAreaInput" placeholder="Coverage area" />
            <input id="broadcastNotesInput" placeholder="Notes" />
          </div>
          <div id="broadcastList" class="comms-list"></div>
        </section>

        <section class="comms-panel">
          <div class="panel-title">
            <h3>Printed Message Templates</h3>
            <button id="addTemplateEntry">Add</button>
          </div>
          <div class="comms-form template-form">
            <input id="templateTitleInput" placeholder="Template title" />
            <textarea id="templateBodyInput" placeholder="Message template text"></textarea>
          </div>
          <div id="templateList" class="comms-list"></div>
        </section>
      </div>
    </section>

`;

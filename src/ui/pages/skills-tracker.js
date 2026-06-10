export const skillsTrackerPage = `    <section class="page" id="skills-tracker">
      <header class="topbar">
        <div>
          <p class="eyebrow">Skills Tracker</p>
          <h2>Practice, articles, and task links</h2>
        </div>
        <div class="plan-actions"><button id="addSkillEntry">Add Skill</button></div>
      </header>
      <section class="budget-summary">
        <article><span>Tracked skills</span><strong id="skillTotal">0</strong></article>
        <article><span>Practice due</span><strong id="skillPracticeDue">0</strong></article>
        <article><span>Linked articles</span><strong id="skillArticleCount">0</strong></article>
      </section>
      <section class="vault-toolbar">
        <input id="skillNameInput" placeholder="Skill" />
        <select id="skillLevelInput"><option>Beginner</option><option>Practicing</option><option>Competent</option><option>Trainer</option></select>
        <input id="skillOwnerInput" placeholder="Household member" />
        <input id="skillPracticeInput" type="date" />
        <input id="skillLibraryInput" placeholder="Offline article / ZIM path" />
        <textarea id="skillTaskInput" placeholder="Practice task, drill, or linked task"></textarea>
      </section>
      <div id="skillsList" class="vault-list"></div>
    </section>

`;

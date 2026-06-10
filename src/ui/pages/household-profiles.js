export const householdProfilesPage = `    <section class="page" id="household-profiles">
      <header class="topbar">
        <div>
          <p class="eyebrow">Household Profiles</p>
          <h2>People, pets, needs, medication, and requirements</h2>
        </div>
      </header>
      <section class="budget-summary">
        <article><span>People</span><strong id="profilePeopleCount">0</strong></article>
        <article><span>Daily water</span><strong id="profileWaterTotal">0 gal</strong></article>
        <article><span>Daily calories</span><strong id="profileCalorieTotal">0</strong></article>
      </section>
      <div class="comms-grid">
        <section class="comms-panel">
          <div class="panel-title"><h3>People</h3><button id="addPersonProfile">Add</button></div>
          <div class="comms-form"><input id="personNameInput" placeholder="Name" /><input id="personMedicalInput" placeholder="Medical needs" /><input id="personMedsInput" placeholder="Medications" /><input id="personDietInput" placeholder="Diet restrictions" /><input id="personMobilityInput" placeholder="Mobility needs" /><input id="personWaterInput" type="number" min="0" step=".25" placeholder="Water gal/day" /><input id="personCaloriesInput" type="number" min="0" step="100" placeholder="Calories/day" /></div>
          <div id="peopleProfileList" class="comms-list"></div>
        </section>
        <section class="comms-panel">
          <div class="panel-title"><h3>Pets / Livestock</h3><button id="addPetProfile">Add</button></div>
          <div class="comms-form"><input id="petNameInput" placeholder="Name/group" /><input id="petSpeciesInput" placeholder="Species" /><input id="petMedicalInput" placeholder="Medical needs" /><input id="petDietInput" placeholder="Feed/diet" /><input id="petMobilityInput" placeholder="Transport/mobility" /><input id="petWaterInput" type="number" min="0" step=".25" placeholder="Water gal/day" /><input id="petCaloriesInput" type="number" min="0" step="100" placeholder="Calories/day" /></div>
          <div id="petProfileList" class="comms-list"></div>
        </section>
      </div>
    </section>
`;

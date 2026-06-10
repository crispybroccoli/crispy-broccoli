export const evacuationPlannerPage = `    <section class="page" id="evacuation-planner">
      <header class="topbar">
        <div>
          <p class="eyebrow">Evacuation / Bug-Out Planner</p>
          <h2>Routes, bags, vehicles, animals, and documents</h2>
        </div>
      </header>
      <section class="budget-summary">
        <article><span>Routes</span><strong id="evacRouteCount">0</strong></article>
        <article><span>Go-bags</span><strong id="evacBagCount">0</strong></article>
        <article><span>Critical docs</span><strong id="evacDocCount">0</strong></article>
      </section>
      <div class="comms-grid">
        <section class="comms-panel"><div class="panel-title"><h3>Routes</h3><button id="addEvacRoute">Add</button></div><div class="comms-form"><input id="evacRouteNameInput" placeholder="Route name" /><input id="evacRouteTriggerInput" placeholder="Trigger" /><input id="evacRouteDistanceInput" placeholder="Distance / time" /><input id="evacRouteNotesInput" placeholder="Hazards, closures, fallback" /></div><div id="evacRouteList" class="comms-list"></div></section>
        <section class="comms-panel"><div class="panel-title"><h3>Go-Bags</h3><button id="addEvacBag">Add</button></div><div class="comms-form"><input id="evacBagNameInput" placeholder="Bag / owner" /><input id="evacBagLocationInput" placeholder="Storage location" /><input id="evacBagStatusInput" placeholder="Status" /><input id="evacBagItemsInput" placeholder="Items / gaps" /></div><div id="evacBagList" class="comms-list"></div></section>
        <section class="comms-panel"><div class="panel-title"><h3>Vehicle Supplies</h3><button id="addEvacVehicle">Add</button></div><div class="comms-form"><input id="evacVehicleNameInput" placeholder="Vehicle" /><input id="evacVehicleFuelInput" placeholder="Fuel range / cans" /><input id="evacVehicleSuppliesInput" placeholder="Supplies" /><input id="evacVehicleNotesInput" placeholder="Maintenance / gaps" /></div><div id="evacVehicleList" class="comms-list"></div></section>
        <section class="comms-panel"><div class="panel-title"><h3>Alternate Destinations</h3><button id="addEvacDestination">Add</button></div><div class="comms-form"><input id="evacDestinationNameInput" placeholder="Destination" /><input id="evacDestinationContactInput" placeholder="Contact" /><input id="evacDestinationCapacityInput" placeholder="Capacity / limits" /><input id="evacDestinationNotesInput" placeholder="Access notes" /></div><div id="evacDestinationList" class="comms-list"></div></section>
        <section class="comms-panel"><div class="panel-title"><h3>Fuel Stops</h3><button id="addEvacFuel">Add</button></div><div class="comms-form"><input id="evacFuelNameInput" placeholder="Stop / cache" /><input id="evacFuelLocationInput" placeholder="Location" /><input id="evacFuelRangeInput" placeholder="Range point" /><input id="evacFuelNotesInput" placeholder="Hours, backup, cash" /></div><div id="evacFuelList" class="comms-list"></div></section>
        <section class="comms-panel"><div class="panel-title"><h3>Pet / Livestock Plan</h3><button id="addEvacAnimal">Add</button></div><div class="comms-form"><input id="evacAnimalNameInput" placeholder="Animal/group" /><input id="evacAnimalTransportInput" placeholder="Transport" /><input id="evacAnimalSuppliesInput" placeholder="Supplies" /><input id="evacAnimalNotesInput" placeholder="Destination / handler" /></div><div id="evacAnimalList" class="comms-list"></div></section>
        <section class="comms-panel"><div class="panel-title"><h3>Critical Docs Checklist</h3><button id="addEvacDoc">Add</button></div><div class="comms-form"><input id="evacDocNameInput" placeholder="Document" /><input id="evacDocLocationInput" placeholder="Location" /><input id="evacDocCopyInput" placeholder="Copy status" /><input id="evacDocNotesInput" placeholder="Notes" /></div><div id="evacDocList" class="comms-list"></div></section>
      </div>
    </section>

`;

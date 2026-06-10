export const homesteadPage = `    <section class="page" id="homestead">
      <header class="topbar">
        <div>
          <p class="eyebrow">Property Planning</p>
          <h2>Build the homestead layout</h2>
        </div>
        <div class="planning-controls">
          <label class="planning-input">
            People
            <input class="householdInput" type="number" min="1" max="20" value="4" />
          </label>
          <label class="planning-input">
            Days off grid
            <input class="durationInput" type="number" min="1" max="3650" value="30" />
          </label>
          <form id="addressForm" class="address-form">
            <input id="addressInput" type="search" placeholder="Look up an address" autocomplete="street-address" />
            <button type="submit">Find</button>
          </form>
        </div>
      </header>

      <div class="map-layout">
        <section class="map-panel">
          <div id="map"></div>
          <div class="map-status" id="mapStatus">Search an address or pan to a property, then draw planning zones.</div>
        </section>
        <aside class="planner-panel">
          <section class="design-panel">
            <div class="panel-title">
              <h3>Design Tools</h3>
              <span id="modeLabel">Grab mode</span>
            </div>
            <div class="tool-actions">
              <button id="grabMode" class="icon-action active" title="Grab and move selected objects">Grab</button>
              <button id="editMode" class="icon-action" title="Edit shape vertices">Edit</button>
              <button id="drawMode" class="icon-action" title="Draw a new shape">Draw</button>
              <button id="undoButton" class="icon-action" title="Undo last layout change">Undo</button>
              <button id="deleteSelected" class="icon-action danger" title="Delete selected object">Delete</button>
              <button id="duplicateSelected" class="icon-action" title="Duplicate selected object">Duplicate</button>
            </div>
            <div class="selected-readout" id="selectedReadout">No object selected.</div>
            <div class="zone-inspector" id="zoneInspector"></div>
            <div class="rotation-tools">
              <button id="rotateLeft" class="icon-action" title="Rotate selected object left">Rotate Left</button>
              <button id="rotateRight" class="icon-action" title="Rotate selected object right">Rotate Right</button>
              <label>
                Angle
                <input id="rotationInput" type="number" min="-180" max="180" step="5" value="15" />
              </label>
            </div>
          </section>
          <section class="design-panel">
            <div class="panel-title">
              <h3>Property Boundary</h3>
              <span>Auto GIS</span>
            </div>
            <div class="parcel-tools">
              <button id="autoParcelBoundary" class="primary">Find From Address</button>
              <button id="drawBoundary">Draw Boundary</button>
              <button id="clearBoundary">Clear Boundary</button>
            </div>
            <div class="selected-readout" id="parcelStatus">Search an address to auto-load the tax GIS parcel boundary.</div>
          </section>
          <section class="design-panel">
            <div class="panel-title">
              <h3>Bases</h3>
              <span id="baseCount">0 saved</span>
            </div>
            <div class="base-tools">
              <button id="setMainBase" class="primary">Set Main Base</button>
              <button id="addCurrentBase">Add Current Base</button>
            </div>
            <div class="selected-readout" id="activeBaseReadout">No base saved yet.</div>
            <div id="baseList" class="base-list"></div>
          </section>
          <section class="design-panel">
            <div class="panel-title">
              <h3>Risk Layers</h3>
              <span>Planning aids</span>
            </div>
            <div class="risk-grid" id="riskLayerControls"></div>
          </section>
          <div class="control-group">
            <label>Map Layer</label>
            <div class="segmented">
              <button class="segment active" data-layer="satellite">Satellite</button>
              <button class="segment" data-layer="streets">Streets</button>
            </div>
          </div>
          <div class="control-group">
            <label>Shape Tool</label>
            <div class="tool-grid">
              <button class="tool active" data-tool="Polygon">Polygon</button>
              <button class="tool" data-tool="Circle">Circle</button>
              <button class="tool" data-tool="LineString">Line</button>
            </div>
          </div>
          <div class="control-group">
            <label>Zone Type</label>
            <select id="zoneSelect">
              <option value="no-go">No-go / unsafe</option>
              <option value="garden">Food production</option>
              <option value="water">Water storage</option>
              <option value="power">Power</option>
              <option value="security">Security line</option>
              <option value="defensible">Defensible radius</option>
            </select>
            <div class="custom-zone-form">
              <input id="customZoneName" type="text" placeholder="Add custom zone type" />
              <input id="customZoneColor" type="color" value="#6f7f45" title="Zone color" />
              <input id="customZoneTarget" type="number" min="0" step="25" value="0" title="Target square feet" />
              <button id="addCustomZone" type="button">Add</button>
            </div>
          </div>
          <div class="button-row">
            <button id="drawToggle" class="primary">Start Drawing</button>
            <button id="clearZones">Clear</button>
          </div>
          <section class="recommendations">
            <h3>Generated Placements</h3>
            <div id="placementCards"></div>
          </section>
        </aside>
      </div>
    </section>

`;

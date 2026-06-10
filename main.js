import './style.css';
import 'ol/ol.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Draw from 'ol/interaction/Draw.js';
import Modify from 'ol/interaction/Modify.js';
import Select from 'ol/interaction/Select.js';
import Snap from 'ol/interaction/Snap.js';
import Translate from 'ol/interaction/Translate.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import {circular} from 'ol/geom/Polygon.js';
import {getArea, getLength} from 'ol/sphere.js';
import {appShellTemplate} from './src/ui/appShell.js';
import {escapeHtml, formatArea, formatLength, formatNumber, slugifyZoneName} from './src/utils/format.js';
import {addDaysToIso, daysUntil, toDateInputValue} from './src/utils/dates.js';
import {getAffiliateMatches, renderAffiliateCategoryOptions, renderAffiliateGear} from './src/features/affiliateGear.js';
import {createPlanListHelpers} from './src/features/planList.js';
import {createTaskBoard} from './src/features/taskBoard.js';
import {readGeoJsonFeatures, serializeFeatures} from './src/map/geoJson.js';
import {createMapLayers} from './src/map/layers.js';
import {createParcelService} from './src/map/parcelService.js';
import {
  createCommunicationsPlan,
  createEvacuationPlan,
  createHouseholdProfiles,
  defaultProjectPhases,
  defaultSkillNames,
  libraryPacks,
  placementRules,
  prepCostDefaults,
  riskLayerDefinitions,
  scenarioDefinitions,
} from './src/data/appData.js';

const app = document.querySelector('#app');
const SQFT_PER_SQM = 10.7639;
const zoneTargets = {
  'no-go': 0,
  garden: 600,
  water: 64,
  power: 80,
  security: 0,
  defensible: 2827,
};
const planStorageKey = 'homestead-ready-plan-v1';
const PLAN_SCHEMA_VERSION = 2;

const projectPhases = defaultProjectPhases.map((phase) => ({...phase}));

const libraryLinks = [];

const prepCategories = [
  {
    name: 'Water',
    target: '2 gal/person/day plus filtration',
    items: [
      {label: 'Stored potable water', unit: 'gallons', current: 20, target: () => getDailyWaterRequirement() * preparednessDays},
      {label: 'Gravity filter capacity', unit: 'gallons/day', current: 2, target: () => getDailyWaterRequirement()},
      {label: 'Bulk water containers', unit: '275 gal totes', current: 1, target: () => Math.ceil((getDailyWaterRequirement() * preparednessDays) / 275)},
    ],
  },
  {
    name: 'Food',
    target: 'Full-duration calories and production',
    items: [
      {label: 'Shelf-stable calories', unit: 'person-days', current: 45, target: () => getCaloriePersonDaysRequirement() * preparednessDays},
      {label: 'Protein reserves', unit: 'servings', current: 30, target: () => household * preparednessDays * 2},
      {label: 'Garden seed sets', unit: 'sets', current: 0, target: () => Math.max(1, Math.ceil(household / 4) + Math.floor(preparednessDays / 365))},
    ],
  },
  {
    name: 'Power',
    target: 'Critical loads with renewable input',
    items: [
      {label: 'Battery bank', unit: 'kWh', current: 1, target: () => Math.ceil(household * 2.5)},
      {label: 'Solar input', unit: 'watts', current: 200, target: () => Math.ceil(household * 300)},
      {label: 'Fuel reserve', unit: 'hours', current: 16, target: () => Math.min(168, preparednessDays * 24)},
    ],
  },
  {
    name: 'Medical',
    target: 'Trauma, meds, sanitation',
    items: [
      {label: 'Trauma kits', unit: 'kits', current: 1, target: () => Math.max(2, Math.ceil(household / 3))},
      {label: 'Prescription buffer', unit: 'days', current: 7, target: () => preparednessDays},
      {label: 'Sanitation kits', unit: 'kits', current: 0, target: () => Math.max(2, Math.ceil(household / 3))},
    ],
  },
  {
    name: 'Comms',
    target: 'Local and long-distance updates',
    items: [
      {label: 'NOAA/weather radio', unit: 'radios', current: 0, target: () => 1},
      {label: 'GMRS/FRS handhelds', unit: 'radios', current: 2, target: () => Math.max(2, household)},
      {label: 'Printed contact plans', unit: 'copies', current: 1, target: () => household},
    ],
  },
  {
    name: 'Security',
    target: 'Visibility, access control, safe routines',
    items: [
      {label: 'Motion lights', unit: 'zones', current: 1, target: () => Math.max(4, household)},
      {label: 'Gate/door reinforcement', unit: 'points', current: 2, target: () => Math.max(4, Math.ceil(household * 1.5))},
      {label: 'Fire extinguishers', unit: 'units', current: 1, target: () => Math.max(3, Math.ceil(household / 2) + 2)},
    ],
  },
];

let activeTab = 'overview';
let selectedTool = 'Polygon';
let selectedZone = 'no-go';
let activeLayer = 'satellite';
let household = 4;
let preparednessDays = 30;
let drawInteraction;
let boundaryDrawInteraction;
let modifyInteraction;
let selectInteraction;
let translateInteraction;
let addressMarker;
let activeMode = 'grab';
let currentAddressContext;
let activeBaseId;
let selectedRiskLayers = new Set();
let activeScenarios = new Set();
let autosaveTimer;
let isLoadingPlan = false;
let expandedPrepCategory = 'Water';
const shoppingOverrides = {};
const maintenanceItems = [];
const maintenanceOverrides = {};
const documentVaultItems = [];
const communicationsPlan = createCommunicationsPlan();
const evacuationPlan = createEvacuationPlan();
const skillsTracker = defaultSkillNames.map((name) => ({
  id: `skill-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  level: 'Beginner',
  owner: '',
  nextPractice: '',
  library: '',
  task: '',
}));
const householdProfiles = createHouseholdProfiles();
const baseLocations = [];
const undoStack = [];
const prepUndoStack = [];
const prepRedoStack = [];

app.innerHTML = appShellTemplate;

const {
  streetLayer,
  satelliteLayer,
  zoneLayer,
  markerLayer,
  parcelLayer,
  structureLayer,
  riskLayer,
  zoneSource,
  markerSource,
  parcelSource,
  structureSource,
  riskSource,
  zoneColors,
  zoneLabels,
} = createMapLayers({riskLayerDefinitions});

const map = new Map({
  target: 'map',
  layers: [satelliteLayer, streetLayer, parcelLayer, structureLayer, riskLayer, zoneLayer, markerLayer],
  view: new View({
    center: fromLonLat([-74.006, 40.7128]),
    zoom: 17,
    minZoom: 3,
    maxZoom: 24,
  }),
});

const parcelService = createParcelService({
  map,
  parcelSource,
  structureSource,
  readGeoJsonFeatures,
  toLonLat,
  updateParcelStatus,
});
const {getAddressRegion} = parcelService;

selectInteraction = new Select({
  layers: [zoneLayer],
  hitTolerance: 18,
});
translateInteraction = new Translate({
  features: selectInteraction.getFeatures(),
});
modifyInteraction = new Modify({source: zoneSource});

map.addInteraction(selectInteraction);
map.addInteraction(translateInteraction);
map.addInteraction(modifyInteraction);
map.addInteraction(new Snap({source: zoneSource}));
setMode('grab');

selectInteraction.on('select', updateSelectedReadout);
translateInteraction.on('translatestart', () => pushUndo());
translateInteraction.on('translateend', () => {
  updateDashboard();
  updateSelectedReadout();
});
modifyInteraction.on('modifystart', () => pushUndo());
modifyInteraction.on('modifyend', () => {
  updateDashboard();
  updateSelectedReadout();
});

function addDrawInteraction() {
  removeDrawInteraction();
  removeBoundaryDrawInteraction();
  setMode('draw');
  drawInteraction = new Draw({
    source: zoneSource,
    type: selectedTool,
  });
  drawInteraction.on('drawstart', () => pushUndo());
  drawInteraction.on('drawend', (event) => {
    event.feature.set('zone', selectedZone);
    setTimeout(() => {
      removeDrawInteraction();
      setMode('grab');
      updateDashboard();
    }, 0);
  });
  map.addInteraction(drawInteraction);
  setStatus(`Drawing ${selectedZone.replace('-', ' ')} ${selectedTool.toLowerCase()}. Double-click to finish.`);
}

function removeDrawInteraction() {
  if (drawInteraction) {
    map.removeInteraction(drawInteraction);
    drawInteraction = null;
  }
}

function removeBoundaryDrawInteraction() {
  if (boundaryDrawInteraction) {
    map.removeInteraction(boundaryDrawInteraction);
    boundaryDrawInteraction = null;
  }
}

function setMode(mode, updateButtons = true) {
  activeMode = mode;
  const isGrab = mode === 'grab';
  const isEdit = mode === 'edit';
  if (selectInteraction) selectInteraction.setActive(isGrab || isEdit);
  if (translateInteraction) translateInteraction.setActive(isGrab);
  if (modifyInteraction) modifyInteraction.setActive(isEdit);
  if (mode !== 'draw') removeDrawInteraction();
  if (mode !== 'boundary') removeBoundaryDrawInteraction();

  if (updateButtons) {
    document.querySelector('#grabMode')?.classList.toggle('active', isGrab);
    document.querySelector('#editMode')?.classList.toggle('active', isEdit);
    document.querySelector('#drawMode')?.classList.toggle('active', mode === 'draw');
    document.querySelector('#modeLabel').textContent = isGrab ? 'Grab mode' : isEdit ? 'Edit mode' : mode === 'boundary' ? 'Boundary mode' : 'Draw mode';
    document.querySelector('#drawToggle').textContent = mode === 'draw' ? 'Stop Drawing' : 'Start Drawing';
  }
  updateSelectedReadout();
}

function snapshotFeatures() {
  return zoneSource.getFeatures().map((feature) => feature.clone());
}

function pushUndo() {
  undoStack.push(snapshotFeatures());
  if (undoStack.length > 50) undoStack.shift();
  updateUndoButton();
}

function restoreSnapshot(snapshot) {
  selectInteraction.getFeatures().clear();
  zoneSource.clear();
  zoneSource.addFeatures(snapshot.map((feature) => feature.clone()));
  updateDashboard();
  updateSelectedReadout();
  updateUndoButton();
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  restoreSnapshot(snapshot);
  setStatus('Undid the last layout change.');
}

function updateUndoButton() {
  const button = document.querySelector('#undoButton');
  if (button) button.disabled = undoStack.length === 0;
}

function getSelectedFeatures() {
  return selectInteraction ? selectInteraction.getFeatures().getArray() : [];
}

function getFeatureSummary(feature) {
  const zone = zoneLabels[feature.get('zone')] || 'Zone';
  const geometry = feature.getGeometry();
  if (geometry.getType() === 'LineString') {
    const feet = getLength(geometry) * 3.28084;
    return `${zone}: ${formatNumber(feet)} ft line`;
  }
  const sqft = measureArea(geometry) * SQFT_PER_SQM;
  return `${zone}: ${formatArea(sqft)}`;
}

function updateSelectedReadout() {
  const readout = document.querySelector('#selectedReadout');
  if (!readout || !selectInteraction) return;
  const selected = getSelectedFeatures();
  if (!selected.length) {
    readout.textContent = activeMode === 'grab' ? 'Click a shape to select it, then drag to move.' : 'Drawing mode is active.';
    renderZoneInspector();
    return;
  }
  readout.textContent = selected.map(getFeatureSummary).join(' | ');
  renderZoneInspector();
}

function ensureFeatureMeta(feature) {
  if (!feature.get('name')) feature.set('name', zoneLabels[feature.get('zone')] || 'Planning Zone');
  if (!feature.get('status')) feature.set('status', 'Planned');
  if (!feature.get('priority')) feature.set('priority', 'Medium');
  if (!feature.get('notes')) feature.set('notes', '');
  if (!feature.get('cost')) feature.set('cost', 0);
}

function renderZoneInspector() {
  const inspector = document.querySelector('#zoneInspector');
  if (!inspector || !selectInteraction) return;
  const [feature] = getSelectedFeatures();
  if (!feature) {
    inspector.innerHTML = '<div class="empty-inspector">Select one object to edit details.</div>';
    return;
  }
  ensureFeatureMeta(feature);
  const geometry = feature.getGeometry();
  const size = geometry.getType() === 'LineString'
    ? formatLength(getLength(geometry) * 3.28084)
    : formatArea(Math.abs(measureArea(geometry)) * SQFT_PER_SQM);

  inspector.innerHTML = `
    <label>Name<input data-inspect="name" value="${escapeHtml(feature.get('name'))}" /></label>
    <label>Zone
      <select data-inspect="zone">
        ${Object.entries(zoneLabels).map(([value, label]) => `<option value="${value}" ${feature.get('zone') === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
    </label>
    <div class="inspector-row">
      <label>Priority
        <select data-inspect="priority">
          ${['Low', 'Medium', 'High'].map((value) => `<option ${feature.get('priority') === value ? 'selected' : ''}>${value}</option>`).join('')}
        </select>
      </label>
      <label>Status
        <select data-inspect="status">
          ${['Planned', 'Active', 'Done'].map((value) => `<option ${feature.get('status') === value ? 'selected' : ''}>${value}</option>`).join('')}
        </select>
      </label>
    </div>
    <label>Estimated cost<input data-inspect="cost" type="number" min="0" step="25" value="${Number(feature.get('cost')) || 0}" /></label>
    <label>Notes<textarea data-inspect="notes">${escapeHtml(feature.get('notes'))}</textarea></label>
    <small>${size}</small>
  `;

  inspector.querySelectorAll('[data-inspect]').forEach((field) => {
    field.addEventListener('input', (event) => {
      const key = event.target.dataset.inspect;
      const value = key === 'cost' ? Number(event.target.value) || 0 : event.target.value;
      feature.set(key, value);
      if (key === 'zone') feature.set('sizeLabel', '');
      feature.changed();
      updateDashboard();
    });
  });
}

function colorToFill(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},.22)`;
}

function renderZoneOptions(selected = selectedZone) {
  const select = document.querySelector('#zoneSelect');
  if (!select) return;
  select.innerHTML = Object.entries(zoneLabels).map(([value, label]) => `
    <option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>
  `).join('');
}

function addCustomZoneType() {
  const nameInput = document.querySelector('#customZoneName');
  const colorInput = document.querySelector('#customZoneColor');
  const targetInput = document.querySelector('#customZoneTarget');
  const label = nameInput.value.trim();
  if (!label) {
    setStatus('Enter a custom zone name first.');
    return;
  }
  let key = slugifyZoneName(label);
  let suffix = 2;
  while (zoneLabels[key]) {
    key = `${slugifyZoneName(label)}-${suffix}`;
    suffix += 1;
  }
  const color = colorInput.value || '#6f7f45';
  zoneLabels[key] = label;
  zoneColors[key] = {fill: colorToFill(color), stroke: color};
  zoneTargets[key] = Math.max(0, Number(targetInput.value) || 0);
  selectedZone = key;
  nameInput.value = '';
  renderZoneOptions(key);
  renderZoneInspector();
  updateDashboard();
  setStatus(`${label} zone type added.`);
}

function deleteSelectedFeatures() {
  const selected = getSelectedFeatures();
  if (!selected.length) {
    setStatus('Select an object before deleting.');
    return;
  }
  pushUndo();
  selected.forEach((feature) => zoneSource.removeFeature(feature));
  selectInteraction.getFeatures().clear();
  updateDashboard();
  updateSelectedReadout();
  setStatus('Selected object deleted.');
}

function duplicateSelectedFeatures() {
  const selected = getSelectedFeatures();
  if (!selected.length) {
    setStatus('Select an object before duplicating.');
    return;
  }
  pushUndo();
  selectInteraction.getFeatures().clear();
  selected.forEach((feature) => {
    const clone = feature.clone();
    clone.getGeometry().translate(5, -5);
    zoneSource.addFeature(clone);
    selectInteraction.getFeatures().push(clone);
  });
  updateDashboard();
  updateSelectedReadout();
  setStatus('Selected object duplicated. Drag the copy into position.');
}

function rotateSelectedFeatures(direction) {
  const selected = getSelectedFeatures();
  if (!selected.length) {
    setStatus('Select an object before rotating.');
    return;
  }
  const degrees = Math.max(-180, Math.min(180, Number(document.querySelector('#rotationInput').value) || 15));
  const radians = (degrees * direction * Math.PI) / 180;
  pushUndo();
  selected.forEach((feature) => {
    const geometry = feature.getGeometry();
    geometry.rotate(radians, getGeometryCenter(geometry));
    feature.changed();
  });
  updateDashboard();
  updateSelectedReadout();
  setStatus(`Rotated selected object ${Math.abs(degrees)} degrees.`);
}

function getGeometryCenter(geometry) {
  const extent = geometry.getExtent();
  return [
    (extent[0] + extent[2]) / 2,
    (extent[1] + extent[3]) / 2,
  ];
}

function addBoundaryDrawInteraction() {
  removeDrawInteraction();
  removeBoundaryDrawInteraction();
  setMode('boundary');
  boundaryDrawInteraction = new Draw({
    source: parcelSource,
    type: 'Polygon',
  });
  boundaryDrawInteraction.on('drawstart', () => {
    parcelSource.clear();
  });
  boundaryDrawInteraction.on('drawend', () => {
    setTimeout(() => {
      removeBoundaryDrawInteraction();
      setMode('grab');
      updateParcelStatus('Manual property boundary added.');
    }, 0);
  });
  map.addInteraction(boundaryDrawInteraction);
  updateParcelStatus('Drawing property boundary. Double-click to finish.');
}

function updateParcelStatus(message) {
  document.querySelector('#parcelStatus').textContent = message;
}

function loadFeatures(source, data) {
  source.clear();
  if (!data?.features?.length) return;
  source.addFeatures(readGeoJsonFeatures(data));
}

function getPlanState() {
  ensureTaskIds();
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    activeTab,
    household,
    preparednessDays,
    zoneTargets,
    zoneLabels,
    zoneColors,
    prepCategories: prepCategories.map((category) => ({
      name: category.name,
      target: category.target,
      items: category.items.map((item) => ({
        label: item.label,
        unit: item.unit,
        current: item.current,
        targetMode: item.targetMode || 'formula',
        targetValue: item.targetMode === 'fixed' ? getPrepItemTarget(item) : undefined,
        location: item.location || '',
        expires: item.expires || '',
        cost: item.cost || prepCostDefaults[item.label] || 0,
      })),
    })),
    projectPhases,
    shoppingOverrides,
    maintenanceItems,
    maintenanceOverrides,
    documentVaultItems,
    communicationsPlan,
    evacuationPlan,
    skillsTracker,
    householdProfiles,
    baseLocations,
    activeBaseId,
    libraryLinks,
    activeScenarios: Array.from(activeScenarios),
    zones: serializeFeatures(zoneSource),
    parcels: serializeFeatures(parcelSource),
    structures: serializeFeatures(structureSource),
    risks: Array.from(selectedRiskLayers),
    center: toLonLat(map.getView().getCenter()),
    zoom: map.getView().getZoom(),
  };
}

function migratePlanState(state) {
  const version = Number(state?.schemaVersion || 0);
  if (!state || typeof state !== 'object') throw new Error('Invalid Homestead Ready backup file');
  if (version > PLAN_SCHEMA_VERSION) {
    throw new Error(`This backup uses schema v${version}; this app supports v${PLAN_SCHEMA_VERSION}`);
  }
  return {
    ...state,
    schemaVersion: PLAN_SCHEMA_VERSION,
    projectPhases: Array.isArray(state.projectPhases) ? state.projectPhases : projectPhases,
    libraryLinks: Array.isArray(state.libraryLinks) ? state.libraryLinks : [],
    activeScenarios: Array.isArray(state.activeScenarios) ? state.activeScenarios : [],
    maintenanceItems: Array.isArray(state.maintenanceItems) ? state.maintenanceItems : [],
    documentVaultItems: Array.isArray(state.documentVaultItems) ? state.documentVaultItems : [],
    skillsTracker: Array.isArray(state.skillsTracker) ? state.skillsTracker : [],
    baseLocations: Array.isArray(state.baseLocations) ? state.baseLocations : [],
    communicationsPlan: state.communicationsPlan || {},
    evacuationPlan: state.evacuationPlan || {},
    householdProfiles: state.householdProfiles || {},
    shoppingOverrides: state.shoppingOverrides || {},
    maintenanceOverrides: state.maintenanceOverrides || {},
  };
}

function savePlan(silent = false) {
  try {
    localStorage.setItem(planStorageKey, JSON.stringify(getPlanState()));
    if (!silent) setStatus('Plan saved in this browser.');
  } catch (error) {
    setStatus('Browser storage is full. Remove large vault files or use smaller PDFs/images.');
  }
}

function exportPlanJson() {
  const state = getPlanState();
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `homestead-ready-backup-v${PLAN_SCHEMA_VERSION}-${toDateInputValue()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  setStatus('JSON backup exported.');
}

function importPlanJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const state = migratePlanState(JSON.parse(reader.result));
      localStorage.setItem(planStorageKey, JSON.stringify(state));
      setStatus('JSON backup imported. Reloading plan...');
      loadPlan();
    } catch (error) {
      setStatus(`${error.message}. Import canceled.`);
    }
  });
  reader.readAsText(file);
}

function resetPlan() {
  if (!window.confirm('Reset the local saved plan and return to the default app state?')) return;
  localStorage.removeItem(planStorageKey);
  window.location.reload();
}

function scheduleAutosave() {
  if (isLoadingPlan) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    savePlan(true);
    const indicator = document.querySelector('#autosaveStatus');
    if (indicator) indicator.textContent = `Autosaved ${new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}`;
  }, 500);
}

function refreshAllDynamicViews() {
  syncHouseholdFromProfiles();
  renderPrepGrid();
  renderPlacements();
  renderRiskControls();
  renderRiskLayers();
  renderScenarios();
  renderLibrary();
  renderTaskScenarioOptions();
  renderTaskBoard();
  renderShoppingList();
  renderAffiliateCategoryOptions();
  renderAffiliateGear();
  renderMaintenanceCalendar();
  renderDocumentsVault();
  renderCommunicationsPlan();
  renderEvacuationPlanner();
  renderSkillsTracker();
  renderHouseholdProfiles();
  renderBases();
  renderZoneOptions(selectedZone);
  renderZoneInspector();
  updateSelectedReadout();
  updateDashboard();
}

function serializePrepState() {
  return prepCategories.map((category) => ({
    name: category.name,
    target: category.target,
    items: category.items.map((item) => ({
      label: item.label,
      unit: item.unit,
      current: item.current,
      targetMode: item.targetMode || (typeof item.target === 'function' ? 'formula' : 'fixed'),
      targetValue: getPrepItemTarget(item),
      location: item.location || '',
      expires: item.expires || '',
      cost: item.cost || prepCostDefaults[item.label] || 0,
    })),
  }));
}

function restorePrepState(snapshot) {
  prepCategories.splice(0, prepCategories.length);
  snapshot.forEach((savedCategory) => {
    prepCategories.push({
      name: savedCategory.name,
      target: savedCategory.target || 'Preparedness section',
      items: (savedCategory.items || []).map((savedItem) => {
        const builtIn = findBuiltInPrepItem(savedCategory.name, savedItem.label);
        return {
          ...(builtIn || {}),
          ...savedItem,
          target: builtIn?.target,
          targetMode: savedItem.targetMode || (builtIn ? 'formula' : 'fixed'),
          targetValue: savedItem.targetValue ?? 1,
        };
      }),
    });
  });
  expandedPrepCategory = prepCategories[0]?.name || '';
  renderPrepGrid();
  updateDashboard();
  updatePrepUndoButtons();
}

function findBuiltInPrepItem(categoryName, label) {
  const builtIns = {
    Water: [
      {label: 'Stored potable water', target: () => getDailyWaterRequirement() * preparednessDays},
      {label: 'Gravity filter capacity', target: () => getDailyWaterRequirement()},
      {label: 'Bulk water containers', target: () => Math.ceil((getDailyWaterRequirement() * preparednessDays) / 275)},
    ],
    Food: [
      {label: 'Shelf-stable calories', target: () => getCaloriePersonDaysRequirement() * preparednessDays},
      {label: 'Protein reserves', target: () => household * preparednessDays * 2},
      {label: 'Garden seed sets', target: () => Math.max(1, Math.ceil(household / 4) + Math.floor(preparednessDays / 365))},
    ],
    Power: [
      {label: 'Battery bank', target: () => Math.ceil(household * 2.5)},
      {label: 'Solar input', target: () => Math.ceil(household * 300)},
      {label: 'Fuel reserve', target: () => Math.min(168, preparednessDays * 24)},
    ],
    Medical: [
      {label: 'Trauma kits', target: () => Math.max(2, Math.ceil(household / 3))},
      {label: 'Prescription buffer', target: () => preparednessDays},
      {label: 'Sanitation kits', target: () => Math.max(2, Math.ceil(household / 3))},
    ],
    Comms: [
      {label: 'NOAA/weather radio', target: () => 1},
      {label: 'GMRS/FRS handhelds', target: () => Math.max(2, household)},
      {label: 'Printed contact plans', target: () => household},
    ],
    Security: [
      {label: 'Motion lights', target: () => Math.max(4, household)},
      {label: 'Gate/door reinforcement', target: () => Math.max(4, Math.ceil(household * 1.5))},
      {label: 'Fire extinguishers', target: () => Math.max(3, Math.ceil(household / 2) + 2)},
    ],
  };
  return builtIns[categoryName]?.find((item) => item.label === label);
}

function pushPrepUndo() {
  prepUndoStack.push(serializePrepState());
  if (prepUndoStack.length > 50) prepUndoStack.shift();
  prepRedoStack.length = 0;
  updatePrepUndoButtons();
}

function undoPrepChange() {
  if (!prepUndoStack.length) return;
  prepRedoStack.push(serializePrepState());
  restorePrepState(prepUndoStack.pop());
  setStatus('Undid preparedness change.');
}

function redoPrepChange() {
  if (!prepRedoStack.length) return;
  prepUndoStack.push(serializePrepState());
  restorePrepState(prepRedoStack.pop());
  setStatus('Redid preparedness change.');
}

function updatePrepUndoButtons() {
  const undoButton = document.querySelector('#undoPrep');
  const redoButton = document.querySelector('#redoPrep');
  if (undoButton) undoButton.disabled = prepUndoStack.length === 0;
  if (redoButton) redoButton.disabled = prepRedoStack.length === 0;
}

function loadPlan({silent = false} = {}) {
  const raw = localStorage.getItem(planStorageKey);
  if (!raw) {
    if (!silent) setStatus('No saved plan found in this browser.');
    return;
  }
  isLoadingPlan = true;
  const state = migratePlanState(JSON.parse(raw));
  activeTab = state.activeTab || activeTab;
  household = state.household || household;
  preparednessDays = state.preparednessDays || preparednessDays;
  Object.assign(zoneTargets, state.zoneTargets || {});
  Object.assign(zoneLabels, state.zoneLabels || {});
  Object.assign(zoneColors, state.zoneColors || {});
  (state.prepCategories || []).forEach((savedCategory) => {
    let category = prepCategories.find((item) => item.name === savedCategory.name);
    if (!category) {
      category = {name: savedCategory.name, target: savedCategory.target || 'Custom section', items: []};
      prepCategories.push(category);
    } else {
      category.target = savedCategory.target || category.target;
    }
    savedCategory.items?.forEach((savedItem) => {
      let item = category.items.find((entry) => entry.label === savedItem.label);
      if (!item) {
        item = {label: savedItem.label, unit: savedItem.unit || 'units', current: 0, targetMode: 'fixed', targetValue: savedItem.targetValue || 1};
        category.items.push(item);
      }
      Object.assign(item, savedItem);
      if (item.targetMode !== 'fixed' && findBuiltInPrepItem(category.name, item.label)) {
        item.targetMode = 'formula';
      }
    });
  });
  if (state.projectPhases) {
    projectPhases.splice(0, projectPhases.length, ...state.projectPhases);
  }
  Object.keys(shoppingOverrides).forEach((key) => delete shoppingOverrides[key]);
  Object.assign(shoppingOverrides, state.shoppingOverrides || {});
  maintenanceItems.splice(0, maintenanceItems.length, ...(state.maintenanceItems || []));
  Object.keys(maintenanceOverrides).forEach((key) => delete maintenanceOverrides[key]);
  Object.assign(maintenanceOverrides, state.maintenanceOverrides || {});
  documentVaultItems.splice(0, documentVaultItems.length, ...(state.documentVaultItems || []));
  Object.entries(state.communicationsPlan || {}).forEach(([key, value]) => {
    if (Array.isArray(communicationsPlan[key])) communicationsPlan[key].splice(0, communicationsPlan[key].length, ...value);
  });
  Object.entries(state.evacuationPlan || {}).forEach(([key, value]) => {
    if (Array.isArray(evacuationPlan[key])) evacuationPlan[key].splice(0, evacuationPlan[key].length, ...value);
  });
  skillsTracker.splice(0, skillsTracker.length, ...(state.skillsTracker || []));
  Object.entries(state.householdProfiles || {}).forEach(([key, value]) => {
    if (Array.isArray(householdProfiles[key])) householdProfiles[key].splice(0, householdProfiles[key].length, ...value);
  });
  baseLocations.splice(0, baseLocations.length, ...(state.baseLocations || []));
  activeBaseId = state.activeBaseId || baseLocations[0]?.id;
  syncHouseholdFromProfiles();
  libraryLinks.splice(0, libraryLinks.length, ...(state.libraryLinks || []));
  activeScenarios = new Set(state.activeScenarios || []);
  loadFeatures(zoneSource, state.zones);
  loadFeatures(parcelSource, state.parcels);
  loadFeatures(structureSource, state.structures);
  selectedRiskLayers = new Set(state.risks || []);
  renderZoneOptions(selectedZone);
  renderRiskControls();
  renderRiskLayers();
  document.querySelectorAll('.householdInput').forEach((input) => { input.value = household; });
  document.querySelectorAll('.durationInput').forEach((input) => { input.value = preparednessDays; });
  if (state.center) map.getView().setCenter(fromLonLat(state.center));
  if (state.zoom) map.getView().setZoom(state.zoom);
  activateTab(activeTab);
  renderPrepGrid();
  renderPlacements();
  renderLibrary();
  renderScenarios();
  refreshAllDynamicViews();
  prepUndoStack.length = 0;
  prepRedoStack.length = 0;
  updatePrepUndoButtons();
  isLoadingPlan = false;
  if (!silent) setStatus('Saved plan loaded.');
}

function exportReport() {
  const metrics = getZoneMetrics();
  const stats = calculatePrepStats();
  const gapCost = calculateGapCost();
  const report = `
    <html>
      <head>
        <title>Homestead Ready Report</title>
        <style>
          body{font-family:Arial,sans-serif;margin:32px;color:#17211f}
          h1,h2{margin-bottom:8px}
          table{width:100%;border-collapse:collapse;margin:12px 0 24px}
          th,td{border:1px solid #ccd3cc;padding:8px;text-align:left}
          th{background:#edf0e8}
          .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
          .metric{border:1px solid #ccd3cc;padding:12px}
        </style>
      </head>
      <body>
        <h1>Homestead Ready Report</h1>
        <p>${household} people, ${preparednessDays} days off grid. Readiness: ${stats.score}%.</p>
        <div class="grid">
          <div class="metric"><b>Mapped Zones</b><br>${zoneSource.getFeatures().length}</div>
          <div class="metric"><b>Supply Gaps</b><br>${stats.gaps}</div>
          <div class="metric"><b>Gap Cost</b><br>$${formatNumber(gapCost)}</div>
        </div>
        <h2>Layout Areas</h2>
        <table><tr><th>Zone</th><th>Count</th><th>Area</th><th>Length</th></tr>
          ${Object.values(metrics).map((metric) => `<tr><td>${zoneLabels[metric.zone] || metric.zone}</td><td>${metric.count}</td><td>${formatArea(metric.areaSqft)}</td><td>${formatLength(metric.lengthFt)}</td></tr>`).join('')}
        </table>
        <h2>Recommendations</h2>
        <ul>${getRecommendations(metrics, stats).map((item) => `<li>${item}</li>`).join('')}</ul>
        <h2>Active Scenarios</h2>
        <ul>${getActiveScenarioDefinitions().map((scenario) => `<li>${scenario.label}: ${scenario.summary}</li>`).join('') || '<li>None selected</li>'}</ul>
        <h2>Project Phases</h2>
        <table><tr><th>Phase</th><th>Task</th><th>Status</th><th>Cost</th></tr>
          ${projectPhases.map((item) => `<tr><td>${item.phase}</td><td>${escapeHtml(item.task)}</td><td>${item.status}</td><td>$${formatNumber(item.cost)}</td></tr>`).join('')}
        </table>
      </body>
    </html>
  `;
  const reportWindow = window.open('', '_blank');
  reportWindow.document.write(report);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

async function autoLoadParcelBoundary(context = currentAddressContext) {
  return parcelService.autoLoadParcelBoundary(context);
}

function setStatus(message) {
  document.querySelector('#mapStatus').textContent = message;
}

function getZoneMetrics() {
  const metrics = Object.keys(zoneLabels).reduce((acc, zone) => {
    acc[zone] = {zone, count: 0, areaSqft: 0, lengthFt: 0, features: []};
    return acc;
  }, {});

  zoneSource.getFeatures().forEach((feature) => {
    const zone = feature.get('zone') || 'no-go';
    if (!metrics[zone]) metrics[zone] = {zone, count: 0, areaSqft: 0, lengthFt: 0, features: []};
    const geometry = feature.getGeometry();
    metrics[zone].count += 1;
    metrics[zone].features.push(feature);
    if (geometry.getType() === 'LineString') {
      metrics[zone].lengthFt += getLength(geometry) * 3.28084;
    } else {
      metrics[zone].areaSqft += Math.abs(measureArea(geometry)) * SQFT_PER_SQM;
    }
  });

  return metrics;
}

function renderZoneSummary() {
  const summary = document.querySelector('#zoneSummary');
  const metrics = getZoneMetrics();
  const baseZones = ['no-go', 'defensible', 'garden', 'water', 'power', 'security'];
  const orderedZones = [...baseZones, ...Object.keys(zoneLabels).filter((zone) => !baseZones.includes(zone))];

  summary.innerHTML = orderedZones.map((zone) => {
    const metric = metrics[zone];
    const target = zoneTargets[zone] || 0;
    const hasLineOnly = metric.lengthFt && !metric.areaSqft;
    const actual = hasLineOnly ? formatLength(metric.lengthFt) : formatArea(metric.areaSqft);
    const targetText = target ? formatArea(target) : 'No target';
    const progress = target ? Math.min(100, Math.round((metric.areaSqft / target) * 100)) : 0;

    return `
      <article class="zone-stat" style="--zone:${zoneColors[zone]?.stroke || '#66786f'}">
        <div class="zone-stat-head">
          <span>${zoneLabels[zone]}</span>
          <b>${metric.count}</b>
        </div>
        <strong>${actual}</strong>
        <label>
          Target sq ft
          <input class="zoneTargetInput" type="number" min="0" step="25" value="${target}" data-zone-target="${zone}" />
        </label>
        <div class="zone-progress" aria-label="${zoneLabels[zone]} progress">
          <span style="width:${progress}%"></span>
        </div>
        <div class="zone-stat-actions">
          <small>${targetText}</small>
          <button data-focus-zone="${zone}" ${metric.count ? '' : 'disabled'}>Focus</button>
        </div>
      </article>
    `;
  }).join('');

  summary.querySelectorAll('[data-focus-zone]').forEach((button) => {
    button.addEventListener('click', () => focusZone(button.dataset.focusZone));
  });
  summary.querySelectorAll('[data-zone-target]').forEach((input) => {
    input.addEventListener('input', (event) => {
      zoneTargets[event.target.dataset.zoneTarget] = Math.max(0, Number(event.target.value) || 0);
      renderZoneSummary();
    });
  });
}

function focusZone(zone) {
  const features = zoneSource.getFeatures().filter((feature) => (feature.get('zone') || 'no-go') === zone);
  if (!features.length) return;
  selectInteraction.getFeatures().clear();
  features.forEach((feature) => selectInteraction.getFeatures().push(feature));
  const extent = features.reduce((combined, feature) => {
    const featureExtent = feature.getGeometry().getExtent();
    if (!combined) return featureExtent.slice();
    combined[0] = Math.min(combined[0], featureExtent[0]);
    combined[1] = Math.min(combined[1], featureExtent[1]);
    combined[2] = Math.max(combined[2], featureExtent[2]);
    combined[3] = Math.max(combined[3], featureExtent[3]);
    return combined;
  }, null);
  map.getView().fit(extent, {padding: [80, 80, 80, 80], maxZoom: 24, duration: 400});
  updateSelectedReadout();
  setStatus(`${zoneLabels[zone]} zone selected from layout summary.`);
}

function renderRiskControls() {
  const controls = document.querySelector('#riskLayerControls');
  if (!controls) return;
  controls.innerHTML = Object.entries(riskLayerDefinitions).map(([key, risk]) => `
    <label class="risk-toggle" style="--risk:${risk.color}">
      <input type="checkbox" value="${key}" ${selectedRiskLayers.has(key) ? 'checked' : ''} />
      <span>${risk.label}</span>
    </label>
  `).join('');
  controls.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', (event) => {
      event.target.checked ? selectedRiskLayers.add(event.target.value) : selectedRiskLayers.delete(event.target.value);
      renderRiskLayers();
      updateDashboard();
    });
  });
}

function renderRiskLayers() {
  riskSource.clear();
  const center = toLonLat(map.getView().getCenter());
  selectedRiskLayers.forEach((key, index) => {
    const risk = riskLayerDefinitions[key];
    if (!risk) return;
    const geometry = risk.radiusFt
      ? circular(offsetLonLat(center, index * 18, index * -12), risk.radiusFt * 0.3048, 96).transform('EPSG:4326', 'EPSG:3857')
      : rectangleFromCenter(center, key === 'access' ? 1800 : 1200, key === 'access' ? 8 : 5, index * 18, index * -14);
    const feature = new Feature(geometry);
    feature.set('risk', key);
    riskSource.addFeature(feature);
  });
}

function calculateGapCost() {
  return prepCategories.reduce((sum, category) => sum + category.items.reduce((itemSum, item) => {
    const target = Math.ceil(getPrepItemTarget(item));
    const gap = Math.max(0, target - item.current);
    return itemSum + gap * (item.cost || prepCostDefaults[item.label] || 0);
  }, 0), 0);
}

function getPrepItemTarget(item) {
  if (item.targetMode === 'fixed') return Number(item.targetValue) || 0;
  if (typeof item.target === 'function') return item.target();
  const builtIn = findBuiltInPrepItem(findPrepCategoryNameForItem(item), item.label);
  if (builtIn?.target) return builtIn.target();
  return Number(item.targetValue) || 0;
}

function findPrepCategoryNameForItem(item) {
  return prepCategories.find((category) => category.items.includes(item))?.name || '';
}

function getRecommendations(metrics = getZoneMetrics(), stats = calculatePrepStats()) {
  const model = getPlanningModel();
  const gardenBeds = Math.max(1, Math.ceil(metrics.garden.areaSqft / 32));
  const irrigationFeet = Math.ceil(Math.sqrt(Math.max(metrics.garden.areaSqft, 1)) * 4);
  const waterGap = Math.max(0, model.waterTotes - (prepCategories[0].items[2].current || 0));
  const recommendations = [
    metrics.garden.areaSqft ? `Garden: ${formatArea(metrics.garden.areaSqft)} supports roughly ${gardenBeds} 4x8 beds; plan about ${formatLength(irrigationFeet)} of irrigation mainline.` : `Garden: map at least ${formatArea(zoneTargets.garden)} for initial food production.`,
    `Water: target ${formatNumber(model.waterGallons)} gallons for ${household} people over ${preparednessDays} days; add ${waterGap} more 275-gallon tote${waterGap === 1 ? '' : 's'} if using bulk totes.`,
    metrics.defensible.areaSqft ? `Defensible space: ${formatArea(metrics.defensible.areaSqft)} mapped; keep fuel, brush, and stacked materials out of this area.` : 'Defensible space: draw circles or polygons around structures and fuel storage.',
    metrics.power.areaSqft ? `Power: ${formatArea(metrics.power.areaSqft)} reserved; target around ${formatNumber(model.solarWatts)} watts plus ${Math.ceil(household * 2.5)} kWh battery storage.` : `Power: reserve at least ${formatArea(model.powerSqft)} for panels/equipment near critical loads.`,
    stats.critical ? `Supplies: ${stats.critical} critical inventory gaps remain; close water, calories, medical, and comms before cosmetic projects.` : 'Supplies: no critical gaps remain based on current targets.',
  ];
  selectedRiskLayers.forEach((key) => {
    const risk = riskLayerDefinitions[key];
    if (risk) recommendations.push(`Risk: ${risk.action}`);
  });
  getScenarioGeneratedData().tasks.slice(0, 4).forEach((task) => {
    recommendations.push(`Scenario task: ${task}`);
  });
  return recommendations;
}

function renderRecommendations(metrics, stats) {
  const container = document.querySelector('#recommendationEngine');
  if (!container) return;
  container.innerHTML = getRecommendations(metrics, stats).map((text) => `<article class="recommendation-card">${text}</article>`).join('');
}

function renderPhasePlanner() {
  const container = document.querySelector('#phasePlanner');
  if (!container) return;
  container.innerHTML = projectPhases.map((item, index) => `
    <article class="phase-card">
      <div class="phase-head">
        <strong>${item.phase}</strong>
        <select data-phase-status="${index}">
          ${['Planned', 'Active', 'Done'].map((status) => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </div>
      <textarea data-phase-task="${index}">${escapeHtml(item.task)}</textarea>
      <label>Budget<input type="number" min="0" step="50" data-phase-cost="${index}" value="${item.cost}" /></label>
    </article>
  `).join('');
  container.querySelectorAll('[data-phase-status]').forEach((field) => field.addEventListener('input', (event) => {
    projectPhases[Number(event.target.dataset.phaseStatus)].status = event.target.value;
    updateDashboard();
  }));
  container.querySelectorAll('[data-phase-task]').forEach((field) => field.addEventListener('input', (event) => {
    projectPhases[Number(event.target.dataset.phaseTask)].task = event.target.value;
  }));
  container.querySelectorAll('[data-phase-cost]').forEach((field) => field.addEventListener('input', (event) => {
    projectPhases[Number(event.target.dataset.phaseCost)].cost = Number(event.target.value) || 0;
    updateDashboard();
  }));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const {addPlanEntry, renderPlanList} = createPlanListHelpers({makeId, setStatus, scheduleAutosave});
const {
  addTaskCard,
  ensureTaskIds,
  normalizeTaskColumn,
  renderTaskBoard,
  renderTaskScenarioOptions,
} = createTaskBoard({
  projectPhases,
  scenarioDefinitions,
  makeId,
  setStatus,
  scheduleAutosave,
  updateDashboard,
  renderShoppingList,
});


function getShoppingRows() {
  ensureTaskIds();
  const rows = [];
  prepCategories.forEach((category) => {
    category.items.forEach((item) => {
      const target = getPrepItemTarget(item);
      const gap = Math.max(0, Math.ceil(target - (Number(item.current) || 0)));
      if (!gap) return;
      const unitCost = Number(item.cost) || prepCostDefaults[item.label] || 0;
      const key = `inventory:${category.name}:${item.label}`;
      const override = shoppingOverrides[key] || {};
      rows.push({
        key,
        source: 'Inventory gap',
        name: item.label,
        linked: category.name,
        needed: gap,
        unit: item.unit,
        estimatedCost: override.estimatedCost ?? Math.round(gap * unitCost),
        priority: override.priority || (category.name === 'Water' || category.name === 'Medical' ? 'High' : 'Medium'),
        vendor: override.vendor || '',
        buyLater: Boolean(override.buyLater),
      });
    });
  });

  projectPhases.forEach((task) => {
    const estimatedCost = Number(task.cost) || 0;
    if (!estimatedCost) return;
    const key = `task:${task.id}`;
    const override = shoppingOverrides[key] || {};
      rows.push({
        key,
        source: 'Project phase',
        name: task.task,
        linked: [task.zone, task.inventory, task.scenario ? scenarioDefinitions[task.scenario]?.label : ''].filter(Boolean).join(' / ') || task.phase || 'Task',
        needed: 1,
        unit: 'project',
        estimatedCost: override.estimatedCost ?? estimatedCost,
        priority: override.priority || (normalizeTaskColumn(task) === 'This Month' || normalizeTaskColumn(task) === 'In Progress' ? 'High' : 'Medium'),
        vendor: override.vendor || '',
        buyLater: Boolean(override.buyLater),
    });
  });
  return rows;
}

function updateShoppingOverride(key, patch) {
  shoppingOverrides[key] = {...(shoppingOverrides[key] || {}), ...patch};
  scheduleAutosave();
}

function updateBudgetTotals(rows = getShoppingRows()) {
  const buyNow = rows.filter((row) => !row.buyLater).reduce((sum, row) => sum + row.estimatedCost, 0);
  const buyLater = rows.filter((row) => row.buyLater).reduce((sum, row) => sum + row.estimatedCost, 0);
  document.querySelector('#budgetBuyNow').textContent = `$${formatNumber(buyNow)}`;
  document.querySelector('#budgetBuyLater').textContent = `$${formatNumber(buyLater)}`;
  document.querySelector('#budgetLineCount').textContent = rows.length;
}

function renderShoppingList() {
  const list = document.querySelector('#shoppingList');
  if (!list) return;
  const priorityFilter = document.querySelector('#shoppingPriorityFilter')?.value || 'all';
  const sourceFilter = document.querySelector('#shoppingSourceFilter')?.value || 'all';
  const rows = getShoppingRows();
  const visibleRows = rows.filter((row) => (
    (priorityFilter === 'all' || row.priority === priorityFilter) &&
    (sourceFilter === 'all' || row.source === sourceFilter)
  ));
  updateBudgetTotals(rows);

  list.innerHTML = visibleRows.map((row) => {
    const matches = getAffiliateMatches(row, 2);
    return `
    <article class="shopping-row">
      <div class="shopping-main">
        <span>${row.source}</span>
        <strong>${escapeHtml(row.name)}</strong>
        <div class="affiliate-mini-list">
          ${matches.map((product) => `<a href="${escapeHtml(product.affiliateLink)}" target="_blank" rel="noreferrer sponsored">${escapeHtml(product.productType)}</a>`).join('') || '<em>No gear match yet</em>'}
        </div>
        <small>${escapeHtml(row.linked)} · ${formatNumber(row.needed)} ${escapeHtml(row.unit)}</small>
      </div>
      <label>Estimated cost
        <input type="number" min="0" step="5" data-shopping-cost="${escapeHtml(row.key)}" value="${row.estimatedCost}" />
      </label>
      <label>Vendor / source
        <input data-shopping-vendor="${escapeHtml(row.key)}" value="${escapeHtml(row.vendor)}" placeholder="Local store, online, farm supply" />
      </label>
      <label>Priority
        <select data-shopping-priority="${escapeHtml(row.key)}">
          ${['High', 'Medium', 'Low'].map((priority) => `<option ${row.priority === priority ? 'selected' : ''}>${priority}</option>`).join('')}
        </select>
      </label>
      <label class="checkline">
        <input type="checkbox" data-shopping-later="${escapeHtml(row.key)}" ${row.buyLater ? 'checked' : ''} />
        Buy later
      </label>
    </article>
  `;
  }).join('') || '<div class="empty-inspector">No shopping items match the current filters.</div>';

  list.querySelectorAll('[data-shopping-cost]').forEach((field) => {
    field.addEventListener('input', (event) => {
      updateShoppingOverride(event.target.dataset.shoppingCost, {estimatedCost: Number(event.target.value) || 0});
      updateBudgetTotals();
    });
  });
  list.querySelectorAll('[data-shopping-vendor]').forEach((field) => {
    field.addEventListener('input', (event) => updateShoppingOverride(event.target.dataset.shoppingVendor, {vendor: event.target.value}));
  });
  list.querySelectorAll('[data-shopping-priority]').forEach((field) => {
    field.addEventListener('change', (event) => {
      updateShoppingOverride(event.target.dataset.shoppingPriority, {priority: event.target.value});
      renderShoppingList();
    });
  });
  list.querySelectorAll('[data-shopping-later]').forEach((field) => {
    field.addEventListener('change', (event) => {
      updateShoppingOverride(event.target.dataset.shoppingLater, {buyLater: event.target.checked});
      renderShoppingList();
    });
  });
}


function getMaintenanceStatus(row) {
  const days = daysUntil(row.nextDue);
  if (days <= 0) return 'due';
  if (days <= 30) return 'soon';
  return 'later';
}

function getDefaultMaintenanceRows() {
  const today = toDateInputValue();
  return [
    {key: 'default:water-rotation', title: `Rotate stored water for ${household} people`, category: 'Water', nextDue: addDaysToIso(today, 90), intervalDays: 90, notes: 'Refresh containers, inspect seals, and check treatment dates.'},
    {key: 'default:battery-check', title: 'Check batteries and recharge power banks', category: 'Power', nextDue: addDaysToIso(today, 30), intervalDays: 30, notes: 'Test flashlights, lanterns, radios, and battery banks.'},
    {key: 'default:generator-run', title: 'Generator test run', category: 'Power', nextDue: addDaysToIso(today, 30), intervalDays: 30, notes: 'Run under load, check fuel stabilizer, oil, and extension cords.'},
    {key: 'default:radio-check', title: 'Radio and comms check', category: 'Comms', nextDue: addDaysToIso(today, 14), intervalDays: 14, notes: 'Test receive/transmit plan, weather radio, chargers, and call signs.'},
    {key: 'default:seed-starting', title: 'Review seed starting dates', category: 'Garden', nextDue: addDaysToIso(today, 45), intervalDays: 365, notes: 'Adjust for local frost dates and succession planting.'},
    {key: 'default:garden-cycle', title: 'Garden and livestock cycle review', category: 'Garden', nextDue: addDaysToIso(today, 30), intervalDays: 30, notes: 'Review feed, bedding, compost, pest pressure, harvest, and planting windows.'},
    {key: 'default:filter-replacement', title: 'Filter replacement check', category: 'Water', nextDue: addDaysToIso(today, 60), intervalDays: 60, notes: 'Inspect water, HVAC, mask, and air purifier filters.'},
  ];
}

function getMaintenanceRows() {
  const generated = getDefaultMaintenanceRows();
  prepCategories.forEach((category) => {
    category.items.forEach((item) => {
      if (!item.expires) return;
      generated.push({
        key: `expires:${category.name}:${item.label}`,
        title: `Rotate ${item.label}`,
        category: category.name,
        nextDue: item.expires,
        intervalDays: 0,
        notes: `${formatNumber(item.current || 0)} ${item.unit || 'units'} tracked in preparedness.`,
      });
    });
  });

  const custom = maintenanceItems.map((item) => ({
    key: item.id,
    title: item.title,
    category: item.category,
    nextDue: item.nextDue,
    intervalDays: Number(item.intervalDays) || 0,
    notes: item.notes || '',
    custom: true,
  }));

  return [...generated, ...custom].map((row) => {
    const override = maintenanceOverrides[row.key] || {};
    return {...row, ...override, intervalDays: Number(override.intervalDays ?? row.intervalDays) || 0};
  }).sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue));
}

function updateMaintenanceOverride(key, patch) {
  maintenanceOverrides[key] = {...(maintenanceOverrides[key] || {}), ...patch};
  scheduleAutosave();
}

function updateMaintenanceSummary(rows = getMaintenanceRows()) {
  document.querySelector('#maintenanceDueNow').textContent = rows.filter((row) => getMaintenanceStatus(row) === 'due').length;
  document.querySelector('#maintenanceDueSoon').textContent = rows.filter((row) => getMaintenanceStatus(row) === 'soon').length;
  document.querySelector('#maintenanceTotal').textContent = rows.length;
}

function renderMaintenanceCalendar() {
  const list = document.querySelector('#maintenanceList');
  if (!list) return;
  const categoryFilter = document.querySelector('#maintenanceCategoryFilter')?.value || 'all';
  const statusFilter = document.querySelector('#maintenanceStatusFilter')?.value || 'all';
  const rows = getMaintenanceRows();
  const visibleRows = rows.filter((row) => (
    (categoryFilter === 'all' || row.category === categoryFilter) &&
    (statusFilter === 'all' || getMaintenanceStatus(row) === statusFilter)
  ));
  updateMaintenanceSummary(rows);

  list.innerHTML = visibleRows.map((row) => {
    const status = getMaintenanceStatus(row);
    const dayCount = daysUntil(row.nextDue);
    const dueText = dayCount <= 0 ? 'Due now' : `${dayCount} days`;
    return `
      <article class="maintenance-row ${status}">
        <div class="maintenance-main">
          <span>${escapeHtml(row.category)} · ${dueText}</span>
          <strong>${escapeHtml(row.title)}</strong>
          <small>${escapeHtml(row.notes || '')}</small>
        </div>
        <label>Next due
          <input type="date" data-maintenance-field="nextDue" data-maintenance-key="${escapeHtml(row.key)}" value="${escapeHtml(row.nextDue || '')}" />
        </label>
        <label>Repeat days
          <input type="number" min="0" step="1" data-maintenance-field="intervalDays" data-maintenance-key="${escapeHtml(row.key)}" value="${Number(row.intervalDays) || 0}" />
        </label>
        <label>Notes
          <input data-maintenance-field="notes" data-maintenance-key="${escapeHtml(row.key)}" value="${escapeHtml(row.notes || '')}" />
        </label>
        <div class="maintenance-actions">
          <button data-maintenance-complete="${escapeHtml(row.key)}">Complete</button>
          ${row.custom ? `<button class="danger-lite" data-maintenance-remove="${escapeHtml(row.key)}">Remove</button>` : ''}
        </div>
      </article>
    `;
  }).join('') || '<div class="empty-inspector">No maintenance items match the current filters.</div>';

  list.querySelectorAll('[data-maintenance-field]').forEach((field) => {
    field.addEventListener('input', (event) => {
      const key = event.target.dataset.maintenanceKey;
      const fieldName = event.target.dataset.maintenanceField;
      updateMaintenanceOverride(key, {[fieldName]: fieldName === 'intervalDays' ? Number(event.target.value) || 0 : event.target.value});
      updateMaintenanceSummary();
    });
  });
  list.querySelectorAll('[data-maintenance-complete]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.maintenanceComplete;
      const row = getMaintenanceRows().find((item) => item.key === key);
      const nextDue = row?.intervalDays ? addDaysToIso(toDateInputValue(), row.intervalDays) : row?.nextDue;
      updateMaintenanceOverride(key, {lastCompleted: toDateInputValue(), nextDue});
      renderMaintenanceCalendar();
      setStatus('Maintenance item completed.');
    });
  });
  list.querySelectorAll('[data-maintenance-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = maintenanceItems.findIndex((item) => item.id === button.dataset.maintenanceRemove);
      if (index >= 0) maintenanceItems.splice(index, 1);
      delete maintenanceOverrides[button.dataset.maintenanceRemove];
      renderMaintenanceCalendar();
      scheduleAutosave();
      setStatus('Maintenance item removed.');
    });
  });
}

function addMaintenanceItem() {
  const title = document.querySelector('#maintenanceTitleInput').value.trim();
  if (!title) {
    setStatus('Enter a maintenance item first.');
    return;
  }
  maintenanceItems.push({
    id: makeId('maintenance'),
    title,
    category: document.querySelector('#maintenanceCategoryInput').value,
    nextDue: document.querySelector('#maintenanceDueInput').value || toDateInputValue(),
    intervalDays: Number(document.querySelector('#maintenanceIntervalInput').value) || 0,
    notes: document.querySelector('#maintenanceNotesInput').value.trim(),
  });
  ['#maintenanceTitleInput', '#maintenanceDueInput', '#maintenanceIntervalInput', '#maintenanceNotesInput'].forEach((selector) => {
    document.querySelector(selector).value = '';
  });
  renderMaintenanceCalendar();
  scheduleAutosave();
  setStatus('Maintenance item added.');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes = 0) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function updateVaultSummary(rows = documentVaultItems) {
  const dueCount = rows.filter((item) => item.renewalDate && daysUntil(item.renewalDate) <= 30).length;
  const totalSize = rows.reduce((sum, item) => sum + (Number(item.fileSize) || 0), 0);
  document.querySelector('#vaultTotal').textContent = rows.length;
  document.querySelector('#vaultRenewalDue').textContent = dueCount;
  document.querySelector('#vaultStorageSize').textContent = formatBytes(totalSize);
}

function renderDocumentsVault() {
  const list = document.querySelector('#documentsVaultList');
  if (!list) return;
  const categoryFilter = document.querySelector('#vaultCategoryFilter')?.value || 'all';
  const sensitivityFilter = document.querySelector('#vaultSensitivityFilter')?.value || 'all';
  const visibleItems = documentVaultItems.filter((item) => (
    (categoryFilter === 'all' || item.category === categoryFilter) &&
    (sensitivityFilter === 'all' || item.sensitivity === sensitivityFilter)
  ));
  updateVaultSummary();

  list.innerHTML = visibleItems.map((item) => {
    const renewalText = item.renewalDate ? (daysUntil(item.renewalDate) <= 0 ? 'Renewal due' : `${daysUntil(item.renewalDate)} days to renewal`) : 'No renewal date';
    return `
      <article class="vault-row ${String(item.sensitivity || 'Normal').toLowerCase()}">
        <div class="vault-main">
          <span>${escapeHtml(item.category)} · ${escapeHtml(item.sensitivity || 'Normal')} · ${renewalText}</span>
          <strong>${escapeHtml(item.title || item.fileName)}</strong>
          <small>${escapeHtml(item.fileName || 'No file')} · ${formatBytes(item.fileSize || 0)} · ${escapeHtml(item.linkedTo || 'Unlinked')}</small>
        </div>
        <label>Title
          <input data-vault-field="title" data-vault-id="${escapeHtml(item.id)}" value="${escapeHtml(item.title || '')}" />
        </label>
        <label>Renewal
          <input type="date" data-vault-field="renewalDate" data-vault-id="${escapeHtml(item.id)}" value="${escapeHtml(item.renewalDate || '')}" />
        </label>
        <label>Notes
          <input data-vault-field="notes" data-vault-id="${escapeHtml(item.id)}" value="${escapeHtml(item.notes || '')}" />
        </label>
        <div class="vault-actions">
          <a href="${item.dataUrl}" download="${escapeHtml(item.fileName || item.title || 'document')}" target="_blank" rel="noreferrer">Open</a>
          <button class="danger-lite" data-vault-remove="${escapeHtml(item.id)}">Remove</button>
        </div>
      </article>
    `;
  }).join('') || '<div class="empty-inspector">No documents match the current filters.</div>';

  list.querySelectorAll('[data-vault-field]').forEach((field) => {
    field.addEventListener('input', (event) => {
      const item = documentVaultItems.find((entry) => entry.id === event.target.dataset.vaultId);
      if (!item) return;
      item[event.target.dataset.vaultField] = event.target.value;
      updateVaultSummary();
      scheduleAutosave();
    });
  });
  list.querySelectorAll('[data-vault-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = documentVaultItems.findIndex((entry) => entry.id === button.dataset.vaultRemove);
      if (index >= 0) documentVaultItems.splice(index, 1);
      renderDocumentsVault();
      scheduleAutosave();
      setStatus('Document removed from vault.');
    });
  });
}

async function addVaultDocument() {
  const file = document.querySelector('#vaultFileInput').files?.[0];
  const title = document.querySelector('#vaultTitleInput').value.trim() || file?.name;
  if (!title || !file) {
    setStatus('Choose a PDF or image and enter a document title.');
    return;
  }
  const dataUrl = await readFileAsDataUrl(file);
  documentVaultItems.push({
    id: makeId('document'),
    title,
    category: document.querySelector('#vaultCategoryInput').value,
    sensitivity: document.querySelector('#vaultSensitivityInput').value,
    renewalDate: document.querySelector('#vaultRenewalInput').value,
    linkedTo: document.querySelector('#vaultLinkedInput').value.trim(),
    notes: document.querySelector('#vaultNotesInput').value.trim(),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    dataUrl,
    addedAt: new Date().toISOString(),
  });
  ['#vaultTitleInput', '#vaultRenewalInput', '#vaultLinkedInput', '#vaultNotesInput'].forEach((selector) => {
    document.querySelector(selector).value = '';
  });
  document.querySelector('#vaultFileInput').value = '';
  renderDocumentsVault();
  scheduleAutosave();
  setStatus('Document added to local vault.');
}

function addCommsEntry(collectionKey, fields) {
  const entry = {id: makeId(collectionKey)};
  let hasContent = false;
  fields.forEach(({name, selector}) => {
    const element = document.querySelector(selector);
    entry[name] = element.value.trim();
    if (entry[name]) hasContent = true;
  });
  if (!hasContent) {
    setStatus('Enter communication details before adding.');
    return;
  }
  communicationsPlan[collectionKey].push(entry);
  fields.forEach(({selector}) => {
    document.querySelector(selector).value = '';
  });
  renderCommunicationsPlan();
  scheduleAutosave();
  setStatus('Communication entry added.');
}

function renderCommsList(collectionKey, containerSelector, fields) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const items = communicationsPlan[collectionKey] || [];
  container.innerHTML = items.map((item) => `
    <article class="comms-card">
      ${fields.map((field) => `
        <label>${field.label}
          ${field.long ? `<textarea data-comms-field="${field.name}" data-comms-id="${item.id}" data-comms-collection="${collectionKey}">${escapeHtml(item[field.name] || '')}</textarea>` : `<input data-comms-field="${field.name}" data-comms-id="${item.id}" data-comms-collection="${collectionKey}" value="${escapeHtml(item[field.name] || '')}" />`}
        </label>
      `).join('')}
      <button class="danger-lite" data-comms-remove="${item.id}" data-comms-collection="${collectionKey}">Remove</button>
    </article>
  `).join('') || '<div class="empty-inspector">No entries yet.</div>';
}

function updateCommsSummary() {
  document.querySelector('#commsRadioCount').textContent = communicationsPlan.radios.length;
  document.querySelector('#commsContactCount').textContent = communicationsPlan.contacts.length;
  document.querySelector('#commsRallyCount').textContent = communicationsPlan.rallyPoints.length;
}

function renderCommunicationsPlan() {
  renderCommsList('radios', '#radioList', [
    {name: 'name', label: 'Purpose'},
    {name: 'frequency', label: 'Frequency / channel'},
    {name: 'callSign', label: 'Call sign'},
    {name: 'notes', label: 'Notes'},
  ]);
  renderCommsList('contacts', '#contactList', [
    {name: 'name', label: 'Name'},
    {name: 'role', label: 'Role / branch'},
    {name: 'primary', label: 'Primary'},
    {name: 'backup', label: 'Backup'},
  ]);
  renderCommsList('rallyPoints', '#rallyList', [
    {name: 'name', label: 'Name'},
    {name: 'location', label: 'Location'},
    {name: 'trigger', label: 'When to use'},
    {name: 'notes', label: 'Notes'},
  ]);
  renderCommsList('checkIns', '#checkInList', [
    {name: 'name', label: 'Schedule'},
    {name: 'time', label: 'Time / cadence'},
    {name: 'method', label: 'Method'},
    {name: 'fallback', label: 'Fallback'},
  ]);
  renderCommsList('broadcasts', '#broadcastList', [
    {name: 'name', label: 'Station / source'},
    {name: 'frequency', label: 'Frequency / URL'},
    {name: 'area', label: 'Coverage'},
    {name: 'notes', label: 'Notes'},
  ]);
  renderCommsList('templates', '#templateList', [
    {name: 'title', label: 'Title'},
    {name: 'body', label: 'Template', long: true},
  ]);
  updateCommsSummary();

  document.querySelectorAll('[data-comms-field]').forEach((field) => {
    field.addEventListener('input', (event) => {
      const items = communicationsPlan[event.target.dataset.commsCollection] || [];
      const item = items.find((entry) => entry.id === event.target.dataset.commsId);
      if (!item) return;
      item[event.target.dataset.commsField] = event.target.value;
      scheduleAutosave();
    });
  });
  document.querySelectorAll('[data-comms-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const items = communicationsPlan[button.dataset.commsCollection] || [];
      const index = items.findIndex((entry) => entry.id === button.dataset.commsRemove);
      if (index >= 0) items.splice(index, 1);
      renderCommunicationsPlan();
      scheduleAutosave();
      setStatus('Communication entry removed.');
    });
  });
}

function printCommunicationsPlan() {
  const sections = [
    ['Radio Frequencies', communicationsPlan.radios, ['name', 'frequency', 'callSign', 'notes']],
    ['Family Contact Tree', communicationsPlan.contacts, ['name', 'role', 'primary', 'backup']],
    ['Rally Points', communicationsPlan.rallyPoints, ['name', 'location', 'trigger', 'notes']],
    ['Check-in Schedules', communicationsPlan.checkIns, ['name', 'time', 'method', 'fallback']],
    ['Emergency Broadcast Stations', communicationsPlan.broadcasts, ['name', 'frequency', 'area', 'notes']],
    ['Printed Message Templates', communicationsPlan.templates, ['title', 'body']],
  ];
  const content = sections.map(([title, rows, keys]) => `
    <h2>${title}</h2>
    ${rows.map((row) => `<p>${keys.map((key) => `<strong>${key}:</strong> ${escapeHtml(row[key] || '')}`).join('<br>')}</p>`).join('') || '<p>No entries.</p>'}
  `).join('');
  const report = `<html><head><title>Communications Plan</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#17211f}h1,h2{margin-bottom:8px}p{border:1px solid #ccd3cc;padding:10px;margin:8px 0}</style></head><body><h1>Communications Plan</h1>${content}</body></html>`;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(report);
  printWindow.document.close();
  printWindow.print();
}


function renderEvacuationPlanner() {
  renderPlanList(evacuationPlan, 'routes', '#evacRouteList', [{name: 'name', label: 'Route'}, {name: 'trigger', label: 'Trigger'}, {name: 'distance', label: 'Distance / time'}, {name: 'notes', label: 'Notes'}], renderEvacuationPlanner);
  renderPlanList(evacuationPlan, 'goBags', '#evacBagList', [{name: 'name', label: 'Bag'}, {name: 'location', label: 'Location'}, {name: 'status', label: 'Status'}, {name: 'items', label: 'Items / gaps'}], renderEvacuationPlanner);
  renderPlanList(evacuationPlan, 'vehicleSupplies', '#evacVehicleList', [{name: 'name', label: 'Vehicle'}, {name: 'fuel', label: 'Fuel'}, {name: 'supplies', label: 'Supplies'}, {name: 'notes', label: 'Notes'}], renderEvacuationPlanner);
  renderPlanList(evacuationPlan, 'destinations', '#evacDestinationList', [{name: 'name', label: 'Destination'}, {name: 'contact', label: 'Contact'}, {name: 'capacity', label: 'Capacity'}, {name: 'notes', label: 'Notes'}], renderEvacuationPlanner);
  renderPlanList(evacuationPlan, 'fuelStops', '#evacFuelList', [{name: 'name', label: 'Stop'}, {name: 'location', label: 'Location'}, {name: 'range', label: 'Range'}, {name: 'notes', label: 'Notes'}], renderEvacuationPlanner);
  renderPlanList(evacuationPlan, 'animals', '#evacAnimalList', [{name: 'name', label: 'Animal/group'}, {name: 'transport', label: 'Transport'}, {name: 'supplies', label: 'Supplies'}, {name: 'notes', label: 'Notes'}], renderEvacuationPlanner);
  renderPlanList(evacuationPlan, 'docs', '#evacDocList', [{name: 'name', label: 'Document'}, {name: 'location', label: 'Location'}, {name: 'copy', label: 'Copy'}, {name: 'notes', label: 'Notes'}], renderEvacuationPlanner);
  document.querySelector('#evacRouteCount').textContent = evacuationPlan.routes.length;
  document.querySelector('#evacBagCount').textContent = evacuationPlan.goBags.length;
  document.querySelector('#evacDocCount').textContent = evacuationPlan.docs.length;
}

function addSkillEntry() {
  const name = document.querySelector('#skillNameInput').value.trim();
  if (!name) {
    setStatus('Enter a skill first.');
    return;
  }
  skillsTracker.push({
    id: makeId('skill'),
    name,
    level: document.querySelector('#skillLevelInput').value,
    owner: document.querySelector('#skillOwnerInput').value.trim(),
    nextPractice: document.querySelector('#skillPracticeInput').value,
    library: document.querySelector('#skillLibraryInput').value.trim(),
    task: document.querySelector('#skillTaskInput').value.trim(),
  });
  ['#skillNameInput', '#skillOwnerInput', '#skillPracticeInput', '#skillLibraryInput', '#skillTaskInput'].forEach((selector) => {
    document.querySelector(selector).value = '';
  });
  renderSkillsTracker();
  scheduleAutosave();
}

function renderSkillsTracker() {
  const list = document.querySelector('#skillsList');
  if (!list) return;
  list.innerHTML = skillsTracker.map((skill) => `
    <article class="vault-row">
      <div class="vault-main"><span>${escapeHtml(skill.level || 'Beginner')} · ${skill.nextPractice ? `${daysUntil(skill.nextPractice)} days` : 'No practice date'}</span><strong>${escapeHtml(skill.name)}</strong><small>${escapeHtml(skill.owner || 'Unassigned')} · ${escapeHtml(skill.library || 'No article linked')}</small></div>
      <label>Level<select data-skill-field="level" data-skill-id="${skill.id}">${['Beginner', 'Practicing', 'Competent', 'Trainer'].map((level) => `<option ${skill.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select></label>
      <label>Practice<input type="date" data-skill-field="nextPractice" data-skill-id="${skill.id}" value="${escapeHtml(skill.nextPractice || '')}" /></label>
      <label>Library / task<input data-skill-field="library" data-skill-id="${skill.id}" value="${escapeHtml(skill.library || '')}" /></label>
      <div class="vault-actions"><button class="danger-lite" data-skill-remove="${skill.id}">Remove</button></div>
    </article>
  `).join('');
  document.querySelector('#skillTotal').textContent = skillsTracker.length;
  document.querySelector('#skillPracticeDue').textContent = skillsTracker.filter((skill) => skill.nextPractice && daysUntil(skill.nextPractice) <= 14).length;
  document.querySelector('#skillArticleCount').textContent = skillsTracker.filter((skill) => skill.library).length;
  list.querySelectorAll('[data-skill-field]').forEach((field) => {
    field.addEventListener('input', (event) => {
      const skill = skillsTracker.find((entry) => entry.id === event.target.dataset.skillId);
      if (!skill) return;
      skill[event.target.dataset.skillField] = event.target.value;
      scheduleAutosave();
    });
  });
  list.querySelectorAll('[data-skill-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = skillsTracker.findIndex((entry) => entry.id === button.dataset.skillRemove);
      if (index >= 0) skillsTracker.splice(index, 1);
      renderSkillsTracker();
      scheduleAutosave();
    });
  });
}

function syncHouseholdFromProfiles() {
  if (!householdProfiles.people.length) return;
  household = Math.max(1, householdProfiles.people.length);
  document.querySelectorAll('.householdInput').forEach((input) => { input.value = household; });
}

function getProfileRequirementTotals() {
  const peopleWater = householdProfiles.people.reduce((sum, item) => sum + (Number(item.water) || 2), 0);
  const petWater = householdProfiles.pets.reduce((sum, item) => sum + (Number(item.water) || 0), 0);
  const peopleCalories = householdProfiles.people.reduce((sum, item) => sum + (Number(item.calories) || 2200), 0);
  const petCalories = householdProfiles.pets.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  return {water: peopleWater + petWater, calories: peopleCalories + petCalories};
}

function getDailyWaterRequirement() {
  const total = getProfileRequirementTotals().water;
  return total || household * 2;
}

function getCaloriePersonDaysRequirement() {
  const total = getProfileRequirementTotals().calories;
  return total ? Math.ceil(total / 2200) : household;
}

function addProfileEntry(type) {
  const prefix = type === 'people' ? 'person' : 'pet';
  const name = document.querySelector(`#${prefix}NameInput`).value.trim();
  if (!name) {
    setStatus('Enter a profile name first.');
    return;
  }
  const entry = {
    id: makeId(prefix),
    name,
    medical: document.querySelector(`#${prefix}MedicalInput`).value.trim(),
    diet: document.querySelector(`#${prefix}DietInput`).value.trim(),
    mobility: document.querySelector(`#${prefix}MobilityInput`).value.trim(),
    water: Number(document.querySelector(`#${prefix}WaterInput`).value) || (type === 'people' ? 2 : 0),
    calories: Number(document.querySelector(`#${prefix}CaloriesInput`).value) || (type === 'people' ? 2200 : 0),
  };
  if (type === 'people') entry.meds = document.querySelector('#personMedsInput').value.trim();
  if (type === 'pets') entry.species = document.querySelector('#petSpeciesInput').value.trim();
  householdProfiles[type].push(entry);
  document.querySelectorAll(`[id^="${prefix}"]`).forEach((input) => { input.value = ''; });
  syncHouseholdFromProfiles();
  renderHouseholdProfiles();
  refreshAllDynamicViews();
}

function renderProfileList(type, selector, fields) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = householdProfiles[type].map((profile) => `
    <article class="comms-card">
      ${fields.map((field) => `<label>${field.label}<input data-profile-type="${type}" data-profile-id="${profile.id}" data-profile-field="${field.name}" value="${escapeHtml(profile[field.name] || '')}" /></label>`).join('')}
      <button class="danger-lite" data-profile-type="${type}" data-profile-remove="${profile.id}">Remove</button>
    </article>
  `).join('') || '<div class="empty-inspector">No profiles yet.</div>';
}

function renderHouseholdProfiles() {
  renderProfileList('people', '#peopleProfileList', [{name: 'name', label: 'Name'}, {name: 'medical', label: 'Medical'}, {name: 'meds', label: 'Medications'}, {name: 'diet', label: 'Diet'}, {name: 'mobility', label: 'Mobility'}, {name: 'water', label: 'Water gal/day'}, {name: 'calories', label: 'Calories/day'}]);
  renderProfileList('pets', '#petProfileList', [{name: 'name', label: 'Name/group'}, {name: 'species', label: 'Species'}, {name: 'medical', label: 'Medical'}, {name: 'diet', label: 'Feed/diet'}, {name: 'mobility', label: 'Transport'}, {name: 'water', label: 'Water gal/day'}, {name: 'calories', label: 'Calories/day'}]);
  const totals = getProfileRequirementTotals();
  document.querySelector('#profilePeopleCount').textContent = householdProfiles.people.length;
  document.querySelector('#profileWaterTotal').textContent = `${formatNumber(totals.water)} gal`;
  document.querySelector('#profileCalorieTotal').textContent = formatNumber(totals.calories);
  document.querySelectorAll('[data-profile-field]').forEach((field) => {
    field.addEventListener('input', (event) => {
      const profiles = householdProfiles[event.target.dataset.profileType];
      const profile = profiles.find((entry) => entry.id === event.target.dataset.profileId);
      if (!profile) return;
      profile[event.target.dataset.profileField] = ['water', 'calories'].includes(event.target.dataset.profileField) ? Number(event.target.value) || 0 : event.target.value;
      const totals = getProfileRequirementTotals();
      document.querySelector('#profileWaterTotal').textContent = `${formatNumber(totals.water)} gal`;
      document.querySelector('#profileCalorieTotal').textContent = formatNumber(totals.calories);
      scheduleAutosave();
    });
  });
  document.querySelectorAll('[data-profile-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const profiles = householdProfiles[button.dataset.profileType];
      const index = profiles.findIndex((entry) => entry.id === button.dataset.profileRemove);
      if (index >= 0) profiles.splice(index, 1);
      syncHouseholdFromProfiles();
      renderHouseholdProfiles();
      refreshAllDynamicViews();
    });
  });
}

function getBaseAddressLabel(context = currentAddressContext) {
  const displayName = context?.result?.display_name;
  if (displayName) return displayName.split(',').slice(0, 3).join(', ');
  const center = toLonLat(map.getView().getCenter());
  return `${center[1].toFixed(5)}, ${center[0].toFixed(5)}`;
}

function getCurrentBasePayload(name) {
  const center = currentAddressContext?.lonLat || toLonLat(map.getView().getCenter());
  return {
    id: makeId('base'),
    name,
    label: getBaseAddressLabel(),
    lonLat: center,
    region: currentAddressContext?.region || '',
    address: currentAddressContext?.result?.display_name || '',
    zoom: map.getView().getZoom(),
    savedAt: new Date().toISOString(),
  };
}

function setBaseMarker(base) {
  const coordinates = fromLonLat(base.lonLat);
  if (addressMarker) markerSource.removeFeature(addressMarker);
  addressMarker = new Feature(new Point(coordinates));
  markerSource.addFeature(addressMarker);
  currentAddressContext = {
    lonLat: base.lonLat,
    result: {display_name: base.address || base.label || base.name},
    region: base.region,
  };
}

function saveCurrentAsBase({main = false} = {}) {
  const existingMain = baseLocations[0];
  const base = getCurrentBasePayload(main ? 'Main Base' : `Base ${baseLocations.length + 1}`);
  if (main) {
    base.id = existingMain?.id || makeId('base-main');
    base.name = 'Main Base';
    if (existingMain) baseLocations[0] = base;
    else baseLocations.unshift(base);
  } else {
    baseLocations.push(base);
  }
  activeBaseId = base.id;
  renderBases();
  scheduleAutosave();
  setStatus(`${base.name} saved at ${base.label}.`);
}

function jumpToBase(id) {
  const base = baseLocations.find((item) => item.id === id);
  if (!base) return;
  activeBaseId = id;
  setBaseMarker(base);
  map.getView().animate({center: fromLonLat(base.lonLat), zoom: base.zoom || 19, duration: 500});
  renderBases();
  scheduleAutosave();
  setStatus(`Centered on ${base.name}.`);
}

function removeBase(id) {
  const index = baseLocations.findIndex((item) => item.id === id);
  if (index < 0) return;
  if (index === 0) {
    setStatus('Main Base cannot be removed. Set a new Main Base instead.');
    return;
  }
  baseLocations.splice(index, 1);
  if (activeBaseId === id) activeBaseId = baseLocations[0]?.id;
  renderBases();
  scheduleAutosave();
  setStatus('Base removed.');
}

function renderBases() {
  const list = document.querySelector('#baseList');
  const count = document.querySelector('#baseCount');
  const readout = document.querySelector('#activeBaseReadout');
  if (!list || !count || !readout) return;
  count.textContent = `${baseLocations.length} saved`;
  const activeBase = baseLocations.find((base) => base.id === activeBaseId) || baseLocations[0];
  readout.textContent = activeBase ? `${activeBase.name}: ${activeBase.label}` : 'No base saved yet.';
  list.innerHTML = baseLocations.map((base, index) => `
    <article class="base-item ${base.id === activeBase?.id ? 'active' : ''}">
      <button data-base-jump="${base.id}">
        <strong>${escapeHtml(index === 0 ? 'Main Base' : base.name)}</strong>
        <span>${escapeHtml(base.label)}</span>
      </button>
      ${index === 0 ? '' : `<button class="danger-lite" data-base-remove="${base.id}">Remove</button>`}
    </article>
  `).join('') || '<div class="empty-inspector">Look up an address, then save it as a base.</div>';
  list.querySelectorAll('[data-base-jump]').forEach((button) => {
    button.addEventListener('click', () => jumpToBase(button.dataset.baseJump));
  });
  list.querySelectorAll('[data-base-remove]').forEach((button) => {
    button.addEventListener('click', () => removeBase(button.dataset.baseRemove));
  });
}

function renderLibrary() {
  const packs = document.querySelector('#libraryPacks');
  if (packs) {
    packs.innerHTML = libraryPacks.map((pack) => `
      <article class="library-pack">
        <strong>${pack.name}</strong>
        <p>${pack.query}</p>
        <button data-library-query="${escapeHtml(pack.query)}">Save Reminder</button>
      </article>
    `).join('');
    packs.querySelectorAll('[data-library-query]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelector('#libraryTitle').value = button.closest('.library-pack').querySelector('strong').textContent;
        document.querySelector('#libraryNotes').value = `Download/load: ${button.dataset.libraryQuery}`;
      });
    });
  }

  const saved = document.querySelector('#savedLibraryLinks');
  const count = document.querySelector('#libraryCount');
  if (!saved || !count) return;
  count.textContent = String(libraryLinks.length);
  saved.innerHTML = libraryLinks.length ? libraryLinks.map((link, index) => `
    <article class="saved-reference">
      <div>
        <strong>${escapeHtml(link.title)}</strong>
        <span>${escapeHtml(link.type)} -> ${escapeHtml(link.target || 'Unlinked')}</span>
      </div>
      <p>${escapeHtml(link.notes || '')}</p>
      ${link.url ? `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.url)}</a>` : ''}
      <button data-remove-library-link="${index}">Remove</button>
    </article>
  `).join('') : '<div class="empty-inspector">Optional notes for ZIM files or articles you already have.</div>';
  saved.querySelectorAll('[data-remove-library-link]').forEach((button) => {
    button.addEventListener('click', () => {
      libraryLinks.splice(Number(button.dataset.removeLibraryLink), 1);
      renderLibrary();
      updateDashboard();
    });
  });
}

function saveLibraryLink() {
  const title = document.querySelector('#libraryTitle').value.trim();
  if (!title) {
    setStatus('Add a title before saving a library reference.');
    return;
  }
  libraryLinks.push({
    title,
    url: document.querySelector('#libraryUrl').value.trim(),
    type: document.querySelector('#libraryLinkType').value,
    target: document.querySelector('#libraryLinkTarget').value.trim(),
    notes: document.querySelector('#libraryNotes').value.trim(),
    savedAt: new Date().toISOString(),
  });
  ['#libraryTitle', '#libraryUrl', '#libraryLinkTarget', '#libraryNotes'].forEach((selector) => {
    document.querySelector(selector).value = '';
  });
  renderLibrary();
  updateDashboard();
  setStatus('Offline library reference saved.');
}

function getActiveScenarioDefinitions() {
  return Array.from(activeScenarios).map((key) => scenarioDefinitions[key]).filter(Boolean);
}

function getScenarioGeneratedData() {
  const scenarios = getActiveScenarioDefinitions();
  const priorities = new Set();
  const concerns = new Set();
  const tasks = new Set();
  const risks = new Set();
  const gaps = [];

  scenarios.forEach((scenario) => {
    scenario.priorities.forEach((priority) => priorities.add(priority));
    scenario.mapConcerns.forEach((concern) => concerns.add(concern));
    scenario.tasks.forEach((task) => tasks.add(task));
    scenario.risks.forEach((risk) => risks.add(risk));
  });

  priorities.forEach((label) => {
    const item = prepCategories.flatMap((category) => category.items).find((entry) => entry.label === label);
    if (!item) {
      gaps.push(`${label}: add this item to inventory tracking.`);
      return;
    }
    const target = Math.ceil(getPrepItemTarget(item));
    const gap = Math.max(0, target - item.current);
    if (gap > 0) gaps.push(`${label}: short ${formatNumber(gap)} ${item.unit || 'units'}.`);
  });

  return {
    scenarios,
    priorities: Array.from(priorities),
    concerns: Array.from(concerns),
    tasks: Array.from(tasks),
    risks: Array.from(risks),
    gaps,
  };
}

function renderScenarios() {
  const cards = document.querySelector('#scenarioCards');
  if (!cards) return;
  cards.innerHTML = Object.entries(scenarioDefinitions).map(([key, scenario]) => `
    <article class="scenario-card ${activeScenarios.has(key) ? 'active' : ''}" style="--scenario:${scenario.risks[0] ? riskLayerDefinitions[scenario.risks[0]]?.color || '#2f6f68' : '#2f6f68'}">
      <label>
        <input type="checkbox" value="${key}" ${activeScenarios.has(key) ? 'checked' : ''} />
        <span>${scenario.label}</span>
      </label>
      <p>${scenario.summary}</p>
    </article>
  `).join('');

  cards.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', (event) => {
      event.target.checked ? activeScenarios.add(event.target.value) : activeScenarios.delete(event.target.value);
      renderScenarios();
      updateDashboard();
    });
  });

  renderScenarioOutputs();
}

function renderScenarioOutputs() {
  const data = getScenarioGeneratedData();
  document.querySelector('#scenarioGapCount').textContent = String(data.gaps.length);
  renderScenarioList('#scenarioGaps', data.gaps, 'No scenario-driven inventory gaps.');
  renderScenarioList('#scenarioMapConcerns', data.concerns, 'Select scenarios to generate map concerns.');
  renderScenarioList('#scenarioInventory', data.priorities, 'Select scenarios to prioritize inventory.');
  renderScenarioList('#scenarioTasks', data.tasks, 'Select scenarios to generate tasks.');
}

function renderScenarioList(selector, items, emptyText) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = items.length
    ? items.map((item) => `<div class="scenario-list-item">${escapeHtml(item)}</div>`).join('')
    : `<div class="empty-inspector">${emptyText}</div>`;
}

function applyScenarioRisks() {
  const {risks} = getScenarioGeneratedData();
  risks.forEach((risk) => selectedRiskLayers.add(risk));
  renderRiskControls();
  renderRiskLayers();
  updateDashboard();
  setStatus('Scenario risk layers applied to the map.');
}

function addScenarioTasksToPhases() {
  const {tasks} = getScenarioGeneratedData();
  tasks.forEach((task) => {
    if (!projectPhases.some((phase) => phase.task === task)) {
      projectPhases.push({phase: 'Scenario', column: 'Backlog', task, cost: 0, status: 'Planned', scenario: Array.from(activeScenarios)[0] || ''});
    }
  });
  renderPhasePlanner();
  renderTaskBoard();
  updateDashboard();
  setStatus('Scenario tasks added to project phasing.');
}

function getPlanningModel() {
  const waterGallons = household * preparednessDays * 2;
  const waterTotes = Math.ceil(waterGallons / 275);
  const gardenSqft = Math.max(600 * (household / 4), household * preparednessDays * 2.5);
  const solarWatts = household * 300;

  return {
    waterGallons,
    waterTotes,
    waterSqft: Math.max(64, waterTotes * 32),
    gardenSqft,
    solarWatts,
    powerSqft: Math.max(80, Math.ceil(solarWatts / 15)),
    medicalSqft: Math.max(24, household * 6),
    commsSqft: 36,
    firebreakRadiusFt: 30,
  };
}

function getPlacementSize(type) {
  const model = getPlanningModel();
  const sizeText = {
    water: `${formatNumber(model.waterGallons)} gal storage, ${model.waterTotes} tote footprint, ${formatArea(model.waterSqft)}`,
    garden: `${formatArea(model.gardenSqft)} growing area`,
    power: `${formatNumber(model.solarWatts)} W solar field, ${formatArea(model.powerSqft)} panel footprint`,
    medical: `${formatArea(model.medicalSqft)} indoor cache area`,
    comms: `${formatArea(model.commsSqft)} radio desk/cache`,
    firebreak: `${model.firebreakRadiusFt} ft defensible radius`,
  };
  return sizeText[type] || '';
}

function offsetLonLat([lon, lat], eastMeters, northMeters) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(lat * Math.PI / 180);
  return [
    lon + (eastMeters / metersPerDegreeLon),
    lat + (northMeters / metersPerDegreeLat),
  ];
}

function rectangleFromCenter(centerLonLat, areaSqft, ratio = 1.6, offsetEast = 0, offsetNorth = 0) {
  const center = offsetLonLat(centerLonLat, offsetEast, offsetNorth);
  const areaSqm = areaSqft / SQFT_PER_SQM;
  const width = Math.sqrt(areaSqm * ratio);
  const height = areaSqm / width;
  const corners = [
    offsetLonLat(center, -width / 2, -height / 2),
    offsetLonLat(center, width / 2, -height / 2),
    offsetLonLat(center, width / 2, height / 2),
    offsetLonLat(center, -width / 2, height / 2),
    offsetLonLat(center, -width / 2, -height / 2),
  ].map((coordinate) => fromLonLat(coordinate));
  return new Polygon([corners]);
}

function renderPrepGrid() {
  const grid = document.querySelector('#prepGrid');
  const totalCost = calculateGapCost();
  document.querySelector('#prepCostTotal').textContent = `$${formatNumber(totalCost)}`;
  grid.innerHTML = `
    <section class="prep-add-category">
      <input id="newCategoryName" placeholder="New section name" />
      <input id="newCategoryTarget" placeholder="Section purpose / target" />
      <button id="addPrepCategory" type="button">Add Section</button>
    </section>
    ${prepCategories.map((category) => {
    const isExpanded = expandedPrepCategory === category.name;
    const rows = category.items.map((item, index) => {
      item.cost ??= prepCostDefaults[item.label] || 0;
      item.location ??= '';
      item.expires ??= '';
      item.unit ??= 'units';
      item.targetMode ??= typeof item.target === 'function' ? 'formula' : 'fixed';
      item.targetValue ??= Math.ceil(getPrepItemTarget(item));
      const target = Math.ceil(getPrepItemTarget(item));
      const percent = target ? Math.min(100, Math.round((item.current / target) * 100)) : 100;
      const gap = Math.max(0, target - item.current);
      const gapCost = gap * item.cost;
      return `
        <div class="prep-row">
          <div>
            <input class="prep-name-input" data-prep-field="label" data-category="${category.name}" data-index="${index}" value="${escapeHtml(item.label)}" />
            <span>${formatNumber(item.current)} / ${formatNumber(target)} ${item.unit} - gap $${formatNumber(gapCost)}</span>
          </div>
          <input type="range" min="0" max="${Math.max(target * 2, item.current + 1)}" value="${item.current}" data-category="${category.name}" data-index="${index}" />
          <b>${percent}%</b>
          <div class="inventory-meta">
            <label>Unit<input data-prep-field="unit" data-category="${category.name}" data-index="${index}" value="${escapeHtml(item.unit)}" /></label>
            <label>Target<input data-prep-field="targetValue" data-category="${category.name}" data-index="${index}" type="number" min="0" step="1" value="${target}" ${item.targetMode === 'formula' ? '' : ''} /></label>
            <label>Target mode
              <select data-prep-field="targetMode" data-category="${category.name}" data-index="${index}">
                <option value="formula" ${item.targetMode === 'formula' ? 'selected' : ''}>Auto</option>
                <option value="fixed" ${item.targetMode === 'fixed' ? 'selected' : ''}>Fixed</option>
              </select>
            </label>
            <label>Storage<input data-prep-field="location" data-category="${category.name}" data-index="${index}" value="${escapeHtml(item.location)}" placeholder="Pantry, shed, cache..." /></label>
            <label>Expires<input data-prep-field="expires" data-category="${category.name}" data-index="${index}" type="date" value="${item.expires}" /></label>
            <label>Unit cost<input data-prep-field="cost" data-category="${category.name}" data-index="${index}" type="number" min="0" step="0.5" value="${item.cost}" /></label>
            <button class="remove-prep-item" data-remove-item="${index}" data-category="${category.name}" type="button">Remove Item</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <article class="prep-card ${isExpanded ? 'expanded' : ''}">
        <div class="card-head" data-toggle-category="${category.name}">
          <div>
            <input class="category-name-input" data-category-name="${category.name}" value="${escapeHtml(category.name)}" />
            <input class="category-target-input" data-category-target="${category.name}" value="${escapeHtml(category.target)}" />
          </div>
          <span>${isExpanded ? 'Open' : 'Click to edit'}</span>
        </div>
        <div class="prep-card-body">
          ${rows}
          <div class="prep-item-adder">
            <input data-new-item-label="${category.name}" placeholder="Item name" />
            <input data-new-item-unit="${category.name}" placeholder="Unit" value="units" />
            <input data-new-item-target="${category.name}" type="number" min="0" step="1" value="1" />
            <button data-add-item="${category.name}" type="button">Add Item</button>
            <button class="danger-lite" data-remove-category="${category.name}" type="button">Remove Section</button>
          </div>
        </div>
      </article>
    `;
  }).join('')}
  `;

  grid.querySelector('#addPrepCategory').addEventListener('click', () => {
    const name = grid.querySelector('#newCategoryName').value.trim();
    if (!name) return;
    pushPrepUndo();
    prepCategories.push({name, target: grid.querySelector('#newCategoryTarget').value.trim() || 'Custom preparedness section', items: []});
    expandedPrepCategory = name;
    renderPrepGrid();
    updateDashboard();
  });

  grid.querySelectorAll('[data-toggle-category]').forEach((header) => {
    header.addEventListener('click', (event) => {
      if (event.target.matches('input')) return;
      expandedPrepCategory = expandedPrepCategory === header.dataset.toggleCategory ? '' : header.dataset.toggleCategory;
      renderPrepGrid();
    });
  });

  grid.querySelectorAll('[data-category-name]').forEach((input) => {
    input.addEventListener('focus', pushPrepUndo);
    input.addEventListener('input', (event) => {
      const category = prepCategories.find((item) => item.name === event.target.dataset.categoryName);
      if (!category) return;
      category.name = event.target.value || category.name;
      expandedPrepCategory = category.name;
      event.target.dataset.categoryName = category.name;
      updateDashboard();
    });
  });

  grid.querySelectorAll('[data-category-target]').forEach((input) => {
    input.addEventListener('focus', pushPrepUndo);
    input.addEventListener('input', (event) => {
      const category = prepCategories.find((item) => item.name === event.target.dataset.categoryTarget);
      if (!category) return;
      category.target = event.target.value;
      updateDashboard();
    });
  });

  grid.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const category = prepCategories.find((item) => item.name === event.target.dataset.category);
      pushPrepUndo();
      category.items[Number(event.target.dataset.index)].current = Number(event.target.value);
      renderPrepGrid();
      updateDashboard();
    });
  });
  grid.querySelectorAll('[data-prep-field]').forEach((input) => {
    input.addEventListener('focus', pushPrepUndo);
    input.addEventListener('input', (event) => {
      const category = prepCategories.find((item) => item.name === event.target.dataset.category);
      const item = category.items[Number(event.target.dataset.index)];
      const key = event.target.dataset.prepField;
      if (key === 'cost' || key === 'targetValue') {
        item[key] = Number(event.target.value) || 0;
        if (key === 'targetValue') item.targetMode = 'fixed';
      } else {
        item[key] = event.target.value;
      }
      if (key === 'label' && prepCostDefaults[item.label] && !item.cost) item.cost = prepCostDefaults[item.label];
      if (key === 'targetValue' || key === 'targetMode') renderPrepGrid();
      document.querySelector('#prepCostTotal').textContent = `$${formatNumber(calculateGapCost())}`;
      updateDashboard();
    });
  });

  grid.querySelectorAll('[data-add-item]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = prepCategories.find((item) => item.name === button.dataset.addItem);
      const label = grid.querySelector(`[data-new-item-label="${CSS.escape(button.dataset.addItem)}"]`).value.trim();
      if (!category || !label) return;
      const unit = grid.querySelector(`[data-new-item-unit="${CSS.escape(button.dataset.addItem)}"]`).value.trim() || 'units';
      const targetValue = Number(grid.querySelector(`[data-new-item-target="${CSS.escape(button.dataset.addItem)}"]`).value) || 1;
      pushPrepUndo();
      category.items.push({label, unit, current: 0, targetMode: 'fixed', targetValue, cost: prepCostDefaults[label] || 0, location: '', expires: ''});
      expandedPrepCategory = category.name;
      renderPrepGrid();
      updateDashboard();
    });
  });

  grid.querySelectorAll('[data-remove-item]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = prepCategories.find((item) => item.name === button.dataset.category);
      if (!category) return;
      pushPrepUndo();
      category.items.splice(Number(button.dataset.removeItem), 1);
      renderPrepGrid();
      updateDashboard();
    });
  });

  grid.querySelectorAll('[data-remove-category]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = prepCategories.findIndex((item) => item.name === button.dataset.removeCategory);
      if (index < 0) return;
      pushPrepUndo();
      prepCategories.splice(index, 1);
      expandedPrepCategory = prepCategories[0]?.name || '';
      renderPrepGrid();
      updateDashboard();
    });
  });
}

function renderPlacements() {
  const cards = document.querySelector('#placementCards');
  cards.innerHTML = Object.entries(placementRules).map(([key, rule]) => `
    <article class="placement" style="--accent:${rule.color}">
      <div>
        <span></span>
        <h4>${rule.title}</h4>
      </div>
      <p>${getPlacementSize(key)}</p>
      <small>${rule.reason}</small>
      <button data-place="${key}">Place</button>
    </article>
  `).join('');

  cards.querySelectorAll('[data-place]').forEach((button) => {
    button.addEventListener('click', () => addSuggestedPlacement(button.dataset.place));
  });
}

function addSuggestedPlacement(type) {
  const center = map.getView().getCenter();
  const lonLat = toLonLat(center);
  const model = getPlanningModel();
  const offsets = {
    water: [-22, 12],
    garden: [34, -18],
    power: [18, 32],
    medical: [-12, -14],
    comms: [18, 16],
    firebreak: [0, 0],
  };
  const offset = offsets[type] || [0, 0];
  const geometryByType = {
    water: () => rectangleFromCenter(lonLat, model.waterSqft, 1.8, offset[0], offset[1]),
    garden: () => rectangleFromCenter(lonLat, model.gardenSqft, 1.6, offset[0], offset[1]),
    power: () => rectangleFromCenter(lonLat, model.powerSqft, 2.4, offset[0], offset[1]),
    medical: () => rectangleFromCenter(lonLat, model.medicalSqft, 1.25, offset[0], offset[1]),
    comms: () => rectangleFromCenter(lonLat, model.commsSqft, 1, offset[0], offset[1]),
    firebreak: () => circular(lonLat, model.firebreakRadiusFt * 0.3048, 96).transform('EPSG:4326', 'EPSG:3857'),
  };
  const feature = new Feature(geometryByType[type]());

  pushUndo();
  feature.set('zone', type === 'firebreak' ? 'defensible' : type);
  feature.set('sizeLabel', `${placementRules[type].title}\n${getPlacementSize(type)}`);
  zoneSource.addFeature(feature);
  selectInteraction.getFeatures().clear();
  selectInteraction.getFeatures().push(feature);
  updateDashboard();
  updateSelectedReadout();
  setStatus(`${placementRules[type].title} added near the current map center. Drag it into the right position.`);
}

async function lookupAddress(address) {
  setStatus('Looking up address...');
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('polygon_geojson', '1');
  url.searchParams.set('q', address);

  const response = await fetch(url, {
    headers: {'Accept': 'application/json'},
  });
  if (!response.ok) {
    throw new Error('Address lookup failed');
  }

  const [result] = await response.json();
  if (!result) {
    throw new Error('No matching address found');
  }

  const lon = Number(result.lon);
  const lat = Number(result.lat);
  const coordinates = fromLonLat([lon, lat]);
  map.getView().animate({center: coordinates, zoom: 19, duration: 600});

  if (addressMarker) markerSource.removeFeature(addressMarker);
  addressMarker = new Feature(new Point(coordinates));
  markerSource.addFeature(addressMarker);
  currentAddressContext = {
    lonLat: [lon, lat],
    result,
    region: getAddressRegion(result),
  };
  if (!baseLocations.length) {
    saveCurrentAsBase({main: true});
  } else {
    renderBases();
  }
  setStatus(`Centered on ${result.display_name.split(',').slice(0, 3).join(', ')}.`);
  try {
    await autoLoadParcelBoundary(currentAddressContext);
  } catch (error) {
    updateParcelStatus(`${error.message}. Draw the boundary manually for now.`);
  }
}

function calculatePrepStats() {
  let total = 0;
  let met = 0;
  let gaps = 0;
  let critical = 0;

  prepCategories.forEach((category) => {
    let categoryMet = 0;
    category.items.forEach((item) => {
      const target = Math.ceil(getPrepItemTarget(item));
      const ratio = target ? item.current / target : 1;
      total += 1;
      if (ratio >= 1) met += 1;
      if (ratio < 1) gaps += 1;
      if (ratio < 0.5) critical += 1;
      categoryMet += Math.min(1, ratio);
    });
    category.score = Math.round((categoryMet / category.items.length) * 100);
  });

  return {
    score: Math.round((met / total) * 100),
    gaps,
    critical,
  };
}

function measureArea(geometry) {
  if (geometry.getType() === 'Circle') {
    return Math.PI * Math.pow(geometry.getRadius(), 2);
  }
  return getArea(geometry);
}

function updateDashboard() {
  const stats = calculatePrepStats();
  const riskPenalty = selectedRiskLayers.size * 3 + activeScenarios.size * 2;
  const adjustedScore = Math.max(0, stats.score - riskPenalty);
  const features = zoneSource.getFeatures();
  const metrics = getZoneMetrics();
  const areaFeatures = features.filter((feature) => feature.getGeometry().getType() !== 'LineString');
  const totalArea = Math.round(areaFeatures.reduce((sum, feature) => sum + Math.abs(measureArea(feature.getGeometry())), 0));
  const totalLength = Math.round(features.filter((feature) => feature.getGeometry().getType() === 'LineString')
    .reduce((sum, feature) => sum + getLength(feature.getGeometry()), 0));

  document.querySelector('#readinessScore').textContent = `${adjustedScore}%`;
  document.querySelector('#readinessProgress').value = adjustedScore;
  document.querySelector('#zoneCount').textContent = features.length;
  document.querySelector('#gapCount').textContent = stats.gaps;
  document.querySelector('#criticalCount').textContent = stats.critical;

  renderZoneSummary();
  renderPriorityActions(metrics, stats);
  renderRecommendations(metrics, stats);
  renderPhasePlanner();
  renderTaskBoard();
  if (document.querySelector('#budget-shopping')?.classList.contains('active')) renderShoppingList();
  if (document.querySelector('#maintenance-calendar')?.classList.contains('active')) renderMaintenanceCalendar();
  if (document.querySelector('#documents-vault')?.classList.contains('active')) renderDocumentsVault();
  if (document.querySelector('#communications-plan')?.classList.contains('active')) renderCommunicationsPlan();
  if (document.querySelector('#evacuation-planner')?.classList.contains('active')) renderEvacuationPlanner();
  if (document.querySelector('#skills-tracker')?.classList.contains('active')) renderSkillsTracker();
  if (document.querySelector('#household-profiles')?.classList.contains('active')) renderHouseholdProfiles();
  renderScenarioOutputs();

  document.querySelector('#buildOrder').innerHTML = [
    'Mark hazards, septic, utility easements, slope, and flood-prone no-go zones.',
    'Place water storage before gardens so irrigation distance stays practical.',
    'Add food production in the sunniest safe zone with expansion room.',
    'Put power, medical, and communication caches in protected, accessible areas.',
    totalLength ? `Walk and confirm ${totalLength.toLocaleString()} m of access or security lines.` : 'Draw access lanes, fence lines, and observation paths.',
  ].map((item) => `<li>${item}</li>`).join('');
  scheduleAutosave();
}

function renderPriorityActions(metrics, stats) {
  const actions = [
    {
      done: Boolean(parcelSource.getFeatures().length),
      text: parcelSource.getFeatures().length ? 'Property boundary loaded.' : 'Load or draw the property boundary.',
    },
    {
      done: metrics['no-go'].count > 0,
      text: metrics['no-go'].count ? `${metrics['no-go'].count} no-go zone${metrics['no-go'].count === 1 ? '' : 's'} mapped.` : 'Draw no-go zones for septic, steep slope, flood, wells, and utilities.',
    },
    {
      done: metrics.defensible.count > 0,
      text: metrics.defensible.count ? `${formatArea(metrics.defensible.areaSqft)} defensible space mapped.` : 'Draw defensible radius/clear-space zones around structures.',
    },
    {
      done: stats.critical === 0,
      text: stats.critical ? `Close ${stats.critical} critical supply gap${stats.critical === 1 ? '' : 's'}.` : 'Critical supply gaps closed.',
    },
    {
      done: metrics.garden.areaSqft >= zoneTargets.garden,
      text: `${formatArea(metrics.garden.areaSqft)} garden area mapped against ${formatArea(zoneTargets.garden)} target.`,
    },
  ];
  selectedRiskLayers.forEach((key) => {
    const risk = riskLayerDefinitions[key];
    if (risk) actions.push({done: false, text: risk.action});
  });
  getScenarioGeneratedData().gaps.slice(0, 5).forEach((gap) => {
    actions.push({done: false, text: `Scenario gap: ${gap}`});
  });

  document.querySelector('#priorityActions').innerHTML = actions.map((action) => `
    <label class="action-item">
      <input type="checkbox" ${action.done ? 'checked' : ''} />
      <span>${action.text}</span>
    </label>
  `).join('');
}

function activateTab(tabId) {
  const target = document.querySelector(`.tab[data-tab="${tabId}"]`) ? tabId : 'homestead';
  activeTab = target;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === activeTab));
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === activeTab));
  if (activeTab === 'budget-shopping') renderShoppingList();
  if (activeTab === 'affiliate-gear') renderAffiliateGear();
  if (activeTab === 'maintenance-calendar') renderMaintenanceCalendar();
  if (activeTab === 'documents-vault') renderDocumentsVault();
  if (activeTab === 'communications-plan') renderCommunicationsPlan();
  if (activeTab === 'evacuation-planner') renderEvacuationPlanner();
  if (activeTab === 'skills-tracker') renderSkillsTracker();
  if (activeTab === 'household-profiles') renderHouseholdProfiles();
  setTimeout(() => map.updateSize(), 50);
  scheduleAutosave();
}

function bindEvents() {
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      savePlan();
    }
  });

  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.tab));
  });
  document.querySelectorAll('[data-dashboard-link]').forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.dashboardLink));
  });

  document.querySelectorAll('[data-layer]').forEach((button) => {
    button.addEventListener('click', () => {
      activeLayer = button.dataset.layer;
      satelliteLayer.setVisible(activeLayer === 'satellite');
      streetLayer.setVisible(activeLayer === 'streets');
      document.querySelectorAll('[data-layer]').forEach((item) => item.classList.toggle('active', item === button));
    });
  });

  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedTool = button.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach((item) => item.classList.toggle('active', item === button));
      if (drawInteraction) addDrawInteraction();
    });
  });

  document.querySelector('#zoneSelect').addEventListener('change', (event) => {
    selectedZone = event.target.value;
    if (selectedZone === 'defensible') {
      selectedTool = 'Circle';
      document.querySelectorAll('[data-tool]').forEach((item) => item.classList.toggle('active', item.dataset.tool === selectedTool));
      if (drawInteraction) addDrawInteraction();
    }
  });
  document.querySelector('#addCustomZone').addEventListener('click', addCustomZoneType);

  document.querySelector('#grabMode').addEventListener('click', () => {
    setMode('grab');
    setStatus('Grab mode active. Click a shape to select it, then drag to move.');
  });

  document.querySelector('#editMode').addEventListener('click', () => {
    setMode('edit');
    setStatus('Edit mode active. Click a shape, then drag an edge or vertex handle.');
  });

  document.querySelector('#drawMode').addEventListener('click', () => {
    addDrawInteraction();
  });

  document.querySelector('#undoButton').addEventListener('click', undoLastChange);
  document.querySelector('#deleteSelected').addEventListener('click', deleteSelectedFeatures);
  document.querySelector('#duplicateSelected').addEventListener('click', duplicateSelectedFeatures);
  document.querySelector('#rotateLeft').addEventListener('click', () => rotateSelectedFeatures(-1));
  document.querySelector('#rotateRight').addEventListener('click', () => rotateSelectedFeatures(1));
  document.querySelector('#autoParcelBoundary').addEventListener('click', () => autoLoadParcelBoundary());
  document.querySelector('#setMainBase').addEventListener('click', () => saveCurrentAsBase({main: true}));
  document.querySelector('#addCurrentBase').addEventListener('click', () => saveCurrentAsBase());
  document.querySelector('#drawBoundary').addEventListener('click', addBoundaryDrawInteraction);
  document.querySelector('#clearBoundary').addEventListener('click', () => {
    parcelSource.clear();
    structureSource.clear();
    updateParcelStatus('Property and structure boundaries cleared.');
  });
  document.querySelector('#savePlan').addEventListener('click', savePlan);
  document.querySelector('#loadPlan').addEventListener('click', loadPlan);
  document.querySelector('#exportJson').addEventListener('click', exportPlanJson);
  document.querySelector('#importJson').addEventListener('click', () => document.querySelector('#jsonImportInput').click());
  document.querySelector('#exportReport').addEventListener('click', exportReport);
  document.querySelector('#resetPlan').addEventListener('click', resetPlan);
  document.querySelector('#globalSavePlan').addEventListener('click', savePlan);
  document.querySelector('#globalLoadPlan').addEventListener('click', loadPlan);
  document.querySelector('#globalExportJson').addEventListener('click', exportPlanJson);
  document.querySelector('#globalImportJson').addEventListener('click', () => document.querySelector('#jsonImportInput').click());
  document.querySelector('#globalExportReport').addEventListener('click', exportReport);
  document.querySelector('#globalResetPlan').addEventListener('click', resetPlan);
  document.querySelector('#jsonImportInput').addEventListener('change', (event) => {
    importPlanJson(event.target.files?.[0]);
    event.target.value = '';
  });
  document.querySelector('#openZimReader').addEventListener('click', () => window.open('http://localhost:8080/', '_blank', 'noreferrer'));
  document.querySelector('#refreshZimFrame').addEventListener('click', () => {
    document.querySelector('#zimFrame').src = 'http://localhost:8080/';
  });
  document.querySelector('#saveLibraryLink').addEventListener('click', saveLibraryLink);
  document.querySelector('#applyScenarioRisks').addEventListener('click', applyScenarioRisks);
  document.querySelector('#scenarioToTasks').addEventListener('click', addScenarioTasksToPhases);
  document.querySelector('#addTaskCard').addEventListener('click', addTaskCard);
  document.querySelector('#shoppingPriorityFilter').addEventListener('change', renderShoppingList);
  document.querySelector('#shoppingSourceFilter').addEventListener('change', renderShoppingList);
  document.querySelector('#affiliateSearchInput').addEventListener('input', renderAffiliateGear);
  document.querySelector('#affiliateCategoryFilter').addEventListener('change', renderAffiliateGear);
  document.querySelector('#affiliatePriorityFilter').addEventListener('change', renderAffiliateGear);
  document.querySelector('#addMaintenanceItem').addEventListener('click', addMaintenanceItem);
  document.querySelector('#maintenanceCategoryFilter').addEventListener('change', renderMaintenanceCalendar);
  document.querySelector('#maintenanceStatusFilter').addEventListener('change', renderMaintenanceCalendar);
  document.querySelector('#addVaultDocument').addEventListener('click', addVaultDocument);
  document.querySelector('#vaultCategoryFilter').addEventListener('change', renderDocumentsVault);
  document.querySelector('#vaultSensitivityFilter').addEventListener('change', renderDocumentsVault);
  document.querySelector('#addRadioEntry').addEventListener('click', () => addCommsEntry('radios', [
    {name: 'name', selector: '#radioNameInput'},
    {name: 'frequency', selector: '#radioFrequencyInput'},
    {name: 'callSign', selector: '#radioCallSignInput'},
    {name: 'notes', selector: '#radioNotesInput'},
  ]));
  document.querySelector('#addContactEntry').addEventListener('click', () => addCommsEntry('contacts', [
    {name: 'name', selector: '#contactNameInput'},
    {name: 'role', selector: '#contactRoleInput'},
    {name: 'primary', selector: '#contactPrimaryInput'},
    {name: 'backup', selector: '#contactBackupInput'},
  ]));
  document.querySelector('#addRallyEntry').addEventListener('click', () => addCommsEntry('rallyPoints', [
    {name: 'name', selector: '#rallyNameInput'},
    {name: 'location', selector: '#rallyLocationInput'},
    {name: 'trigger', selector: '#rallyTriggerInput'},
    {name: 'notes', selector: '#rallyNotesInput'},
  ]));
  document.querySelector('#addCheckInEntry').addEventListener('click', () => addCommsEntry('checkIns', [
    {name: 'name', selector: '#checkInNameInput'},
    {name: 'time', selector: '#checkInTimeInput'},
    {name: 'method', selector: '#checkInMethodInput'},
    {name: 'fallback', selector: '#checkInFallbackInput'},
  ]));
  document.querySelector('#addBroadcastEntry').addEventListener('click', () => addCommsEntry('broadcasts', [
    {name: 'name', selector: '#broadcastNameInput'},
    {name: 'frequency', selector: '#broadcastFrequencyInput'},
    {name: 'area', selector: '#broadcastAreaInput'},
    {name: 'notes', selector: '#broadcastNotesInput'},
  ]));
  document.querySelector('#addTemplateEntry').addEventListener('click', () => addCommsEntry('templates', [
    {name: 'title', selector: '#templateTitleInput'},
    {name: 'body', selector: '#templateBodyInput'},
  ]));
  document.querySelector('#printCommsPlan').addEventListener('click', printCommunicationsPlan);
  document.querySelector('#addEvacRoute').addEventListener('click', () => addPlanEntry(evacuationPlan, 'routes', [{name: 'name', selector: '#evacRouteNameInput'}, {name: 'trigger', selector: '#evacRouteTriggerInput'}, {name: 'distance', selector: '#evacRouteDistanceInput'}, {name: 'notes', selector: '#evacRouteNotesInput'}], renderEvacuationPlanner, 'Route'));
  document.querySelector('#addEvacBag').addEventListener('click', () => addPlanEntry(evacuationPlan, 'goBags', [{name: 'name', selector: '#evacBagNameInput'}, {name: 'location', selector: '#evacBagLocationInput'}, {name: 'status', selector: '#evacBagStatusInput'}, {name: 'items', selector: '#evacBagItemsInput'}], renderEvacuationPlanner, 'Go-bag'));
  document.querySelector('#addEvacVehicle').addEventListener('click', () => addPlanEntry(evacuationPlan, 'vehicleSupplies', [{name: 'name', selector: '#evacVehicleNameInput'}, {name: 'fuel', selector: '#evacVehicleFuelInput'}, {name: 'supplies', selector: '#evacVehicleSuppliesInput'}, {name: 'notes', selector: '#evacVehicleNotesInput'}], renderEvacuationPlanner, 'Vehicle supply'));
  document.querySelector('#addEvacDestination').addEventListener('click', () => addPlanEntry(evacuationPlan, 'destinations', [{name: 'name', selector: '#evacDestinationNameInput'}, {name: 'contact', selector: '#evacDestinationContactInput'}, {name: 'capacity', selector: '#evacDestinationCapacityInput'}, {name: 'notes', selector: '#evacDestinationNotesInput'}], renderEvacuationPlanner, 'Destination'));
  document.querySelector('#addEvacFuel').addEventListener('click', () => addPlanEntry(evacuationPlan, 'fuelStops', [{name: 'name', selector: '#evacFuelNameInput'}, {name: 'location', selector: '#evacFuelLocationInput'}, {name: 'range', selector: '#evacFuelRangeInput'}, {name: 'notes', selector: '#evacFuelNotesInput'}], renderEvacuationPlanner, 'Fuel stop'));
  document.querySelector('#addEvacAnimal').addEventListener('click', () => addPlanEntry(evacuationPlan, 'animals', [{name: 'name', selector: '#evacAnimalNameInput'}, {name: 'transport', selector: '#evacAnimalTransportInput'}, {name: 'supplies', selector: '#evacAnimalSuppliesInput'}, {name: 'notes', selector: '#evacAnimalNotesInput'}], renderEvacuationPlanner, 'Animal plan'));
  document.querySelector('#addEvacDoc').addEventListener('click', () => addPlanEntry(evacuationPlan, 'docs', [{name: 'name', selector: '#evacDocNameInput'}, {name: 'location', selector: '#evacDocLocationInput'}, {name: 'copy', selector: '#evacDocCopyInput'}, {name: 'notes', selector: '#evacDocNotesInput'}], renderEvacuationPlanner, 'Document checklist item'));
  document.querySelector('#addSkillEntry').addEventListener('click', addSkillEntry);
  document.querySelector('#addPersonProfile').addEventListener('click', () => addProfileEntry('people'));
  document.querySelector('#addPetProfile').addEventListener('click', () => addProfileEntry('pets'));
  document.querySelector('#undoPrep').addEventListener('click', undoPrepChange);
  document.querySelector('#redoPrep').addEventListener('click', redoPrepChange);
  document.querySelector('#fillMinimums').addEventListener('click', () => {
    pushPrepUndo();
    prepCategories.forEach((category) => {
      category.items.forEach((item) => {
        item.current = Math.max(item.current, Math.ceil(getPrepItemTarget(item)));
      });
    });
    renderPrepGrid();
    updateDashboard();
    setStatus('Preparedness checklist filled to current minimum targets.');
  });

  document.querySelector('#drawToggle').addEventListener('click', () => {
    if (drawInteraction) {
      setMode('grab');
      setStatus('Drawing stopped. Grab mode active.');
      return;
    }
    addDrawInteraction();
  });

  document.querySelector('#clearZones').addEventListener('click', () => {
    if (zoneSource.getFeatures().length) pushUndo();
    selectInteraction.getFeatures().clear();
    zoneSource.clear();
    updateDashboard();
    updateSelectedReadout();
    setStatus('Planning zones cleared.');
  });

  document.querySelector('#addressForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const address = document.querySelector('#addressInput').value.trim();
    if (!address) return;
    try {
      await lookupAddress(address);
    } catch (error) {
      setStatus(`${error.message}. You can still pan the map and draw manually.`);
    }
  });

  document.querySelectorAll('.householdInput').forEach((input) => {
    input.addEventListener('input', (event) => {
      household = Math.max(1, Number(event.target.value) || 1);
      document.querySelectorAll('.householdInput').forEach((field) => {
        if (field !== event.target) field.value = household;
      });
      refreshAllDynamicViews();
    });
  });

  document.querySelectorAll('.durationInput').forEach((input) => {
    input.addEventListener('input', (event) => {
      preparednessDays = Math.max(1, Number(event.target.value) || 1);
      document.querySelectorAll('.durationInput').forEach((field) => {
        if (field !== event.target) field.value = preparednessDays;
      });
      refreshAllDynamicViews();
    });
  });
}

renderPrepGrid();
renderPlacements();
renderZoneOptions();
renderRiskControls();
renderScenarios();
renderTaskScenarioOptions();
renderTaskBoard();
renderShoppingList();
renderAffiliateCategoryOptions();
renderAffiliateGear();
renderMaintenanceCalendar();
renderDocumentsVault();
renderCommunicationsPlan();
renderEvacuationPlanner();
renderSkillsTracker();
renderHouseholdProfiles();
renderBases();
bindEvents();
loadPlan({silent: true});
updateDashboard();
updateUndoButton();
updatePrepUndoButtons();
renderZoneInspector();

// v2 extracted default data/configuration for Homestead Ready.


export const riskLayerDefinitions = {
  flood: {label: 'Flood / drainage watch', color: '#2f80ed', radiusFt: 220, action: 'Keep food storage, medical cache, battery bank, and fuel out of mapped drainage/flood watch areas.'},
  wildfire: {label: 'Wildfire fuel concern', color: '#d06b2f', radiusFt: 340, action: 'Expand defensible space, remove brush piles, and keep propane/fuel away from structures.'},
  slope: {label: 'Slope / erosion review', color: '#7d5a3b', radiusFt: 180, action: 'Avoid gardens, water totes, and heavy batteries on steep or erosion-prone ground.'},
  wetlands: {label: 'Wetlands / low ground review', color: '#2f8f73', radiusFt: 260, action: 'Keep building, compost, fuel, and permanent storage outside wetland or low-ground review areas.'},
  access: {label: 'Access / evacuation route', color: '#384e5c', radiusFt: 0, action: 'Keep access lanes clear and confirm turnaround, gate, and evacuation path widths.'},
  utility: {label: 'Utility corridor', color: '#8f6bd6', radiusFt: 0, action: 'Keep dig zones, trees, water storage, and structures away from utility corridors.'},
};

export const defaultProjectPhases = [
  {phase: 'Immediate', task: 'Map property boundary, no-go zones, and structure defensible space.', cost: 0, status: 'Planned'},
  {phase: '30 days', task: 'Close water storage and filtration gaps.', cost: 650, status: 'Planned'},
  {phase: '90 days', task: 'Install garden area, irrigation path, and compost zone.', cost: 1200, status: 'Planned'},
  {phase: '1 year', task: 'Add solar/battery backup, comms station, and long-duration inventory rotation.', cost: 6500, status: 'Planned'},
];

export const libraryPacks = [
  {name: 'Kiwix Survival Mini', query: 'Small survival / emergency reference ZIM'},
  {name: 'Kiwix Medical Mini', query: 'Small first aid / medical reference ZIM'},
];

export const scenarioDefinitions = {
  powerOutage: {
    label: 'Power Outage',
    summary: 'Grid down conditions where refrigeration, heat, pumps, lighting, charging, and communications become constrained.',
    risks: ['utility'],
    priorities: ['Battery bank', 'Solar input', 'Fuel reserve', 'NOAA/weather radio', 'GMRS/FRS handhelds'],
    mapConcerns: ['Place battery storage indoors or weather-protected.', 'Keep generator exhaust away from doors, windows, and occupied spaces.', 'Map critical circuits, well pump, freezer, and communications location.'],
    tasks: ['Test generator or inverter under real load.', 'Label critical circuits and backup power sequence.', 'Stage extension cords, CO detectors, and charging plan.'],
  },
  winterStorm: {
    label: 'Winter Storm',
    summary: 'Cold, snow, ice, road closures, frozen water, heating demand, and extended indoor sheltering.',
    risks: ['access', 'utility'],
    priorities: ['Fuel reserve', 'Stored potable water', 'Shelf-stable calories', 'Battery bank', 'Fire extinguishers'],
    mapConcerns: ['Mark snow storage, plow path, fuel access, and blocked-driveway alternatives.', 'Keep water storage protected from freezing.', 'Identify heat-safe room and ventilation needs.'],
    tasks: ['Stage heat-safe room supplies.', 'Confirm driveway/access clearing plan.', 'Insulate exposed water and rotate cold-weather vehicle kits.'],
  },
  wildfire: {
    label: 'Wildfire',
    summary: 'Fire risk, smoke, evacuation, defensible space, and exterior fuel reduction.',
    risks: ['wildfire', 'access'],
    priorities: ['Motion lights', 'Stored potable water', 'GMRS/FRS handhelds', 'Printed contact plans', 'Fire extinguishers'],
    mapConcerns: ['Draw defensible zones around structures.', 'Mark brush piles, propane/fuel, wood stacks, and access lanes.', 'Keep evacuation route and turnaround visible.'],
    tasks: ['Clear vegetation and debris near structures.', 'Stage go-bags and document box.', 'Confirm evacuation triggers and contact tree.'],
  },
  flood: {
    label: 'Flood',
    summary: 'Water intrusion, drainage, blocked roads, contamination, and storage relocation.',
    risks: ['flood', 'wetlands', 'access'],
    priorities: ['Stored potable water', 'Sanitation kits', 'Shelf-stable calories', 'Printed contact plans', 'Trauma kits'],
    mapConcerns: ['Mark low ground, drainage channels, sump area, and high-ground storage.', 'Move water-sensitive supplies and batteries above flood line.', 'Map shutoff points and safe egress.'],
    tasks: ['Move critical inventory to higher shelves.', 'Stage sanitation and cleanup supplies.', 'Document shutoffs and flood barriers.'],
  },
  supplyDisruption: {
    label: 'Supply Disruption',
    summary: 'Longer-term shortage of food, fuel, medicine, repair parts, and household consumables.',
    risks: [],
    priorities: ['Shelf-stable calories', 'Protein reserves', 'Prescription buffer', 'Garden seed sets', 'Sanitation kits'],
    mapConcerns: ['Expand garden and compost space.', 'Reserve dry storage and protected cache areas.', 'Map water collection and irrigation path.'],
    tasks: ['Close calorie/protein gaps first.', 'Build rotating pantry list.', 'Add seed, soil, repair, and hygiene reserves.'],
  },
  civilUnrest: {
    label: 'Civil Unrest',
    summary: 'Access control, reduced travel, communications, lighting, family movement, and low-profile routines.',
    risks: ['access'],
    priorities: ['Motion lights', 'Gate/door reinforcement', 'GMRS/FRS handhelds', 'Printed contact plans', 'Shelf-stable calories'],
    mapConcerns: ['Map access points, sight lines, lighting zones, and family rally points.', 'Keep supplies staged out of obvious public view.', 'Identify low-profile parking and entry routes.'],
    tasks: ['Review contact plan and rally points.', 'Improve lighting/access control.', 'Reduce unnecessary travel dependency.'],
  },
  medicalEmergency: {
    label: 'Medical Emergency',
    summary: 'Trauma, illness, medication continuity, isolation, sanitation, and rapid care access.',
    risks: [],
    priorities: ['Trauma kits', 'Prescription buffer', 'Sanitation kits', 'NOAA/weather radio', 'Printed contact plans'],
    mapConcerns: ['Mark medical cache, stretcher path, vehicle access, and isolation area.', 'Keep medical supplies climate-controlled and easy to reach.', 'Map nearest road access for responders.'],
    tasks: ['Audit medications and first-aid supplies.', 'Print medical profiles and contacts.', 'Practice emergency transport and comms plan.'],
  },
};

export const prepCostDefaults = {
  'Stored potable water': 1.1,
  'Gravity filter capacity': 18,
  'Bulk water containers': 180,
  'Shelf-stable calories': 7,
  'Protein reserves': 2,
  'Garden seed sets': 45,
  'Battery bank': 450,
  'Solar input': 1.2,
  'Fuel reserve': 5,
  'Trauma kits': 120,
  'Prescription buffer': 2,
  'Sanitation kits': 75,
  'NOAA/weather radio': 35,
  'GMRS/FRS handhelds': 45,
  'Printed contact plans': 1,
  'Motion lights': 40,
  'Gate/door reinforcement': 65,
  'Fire extinguishers': 35,
};

export const placementRules = {
  water: {
    title: 'Water Storage',
    size: 'Two 275 gallon totes or four 55 gallon barrels',
    reason: 'Place near a structure, shaded when possible, uphill from gardens, and away from vehicle traffic.',
    color: '#1f9bb4',
  },
  garden: {
    title: 'Food Garden',
    size: 'Start with 600-1,000 sq ft for a family of four',
    reason: 'Use open southern exposure, near water, outside septic/no-go zones, and close enough for daily maintenance.',
    color: '#4b8f3a',
  },
  power: {
    title: 'Solar / Power Hub',
    size: '800-1,500 W array with a 5-10 kWh battery cabinet',
    reason: 'Prefer sunny roof or ground mount near protected battery storage and critical circuits.',
    color: '#c58a18',
  },
  medical: {
    title: 'Medical Cache',
    size: 'One climate-controlled cabinet plus one grab-and-go trauma bag',
    reason: 'Keep indoors, dry, accessible, and separated from fuel or chemicals.',
    color: '#b94141',
  },
  comms: {
    title: 'Comms Point',
    size: 'Desk station plus antenna path if allowed',
    reason: 'Put near power backup, printed plans, radios, and a window or mast route.',
    color: '#6b5bbf',
  },
  firebreak: {
    title: 'Firebreak / Clear Zone',
    size: '30 ft defensible space around structures where practical',
    reason: 'Reduce brush, fuel, and stacked materials near buildings and propane tanks.',
    color: '#d06b2f',
  },
};


export const defaultSkillNames = ['First aid', 'Canning', 'Gardening', 'Mechanical repair', 'Radio', 'Navigation', 'Security', 'Firewood', 'Water treatment'];

export function createCommunicationsPlan() {
  return {radios: [], contacts: [], rallyPoints: [], checkIns: [], broadcasts: [], templates: []};
}

export function createEvacuationPlan() {
  return {routes: [], goBags: [], vehicleSupplies: [], destinations: [], fuelStops: [], animals: [], docs: []};
}

export function createHouseholdProfiles() {
  return {people: [], pets: []};
}

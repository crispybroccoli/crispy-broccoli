# Homestead Ready v2

Offline-first preparedness command center for property planning, household readiness, inventory gaps, scenarios, tasks, documents, communications, evacuation planning, skills, and shopping.

## Features

- Property map with satellite/street layers, address lookup, saved bases, parcel/structure overlays, custom zones, risk layers, scale-aware drawing, editing, rotation, undo, and generated placement guidance.
- Preparedness inventory with household-size and duration-based targets, editable categories/items, gap costs, undo/redo, and autosave.
- Household profiles for people, pets, medical needs, medications, dietary restrictions, mobility needs, water requirements, and calorie requirements.
- Scenario planner for power outage, winter storm, wildfire, flood, supply disruption, civil unrest, and medical emergency.
- Task board with backlog, this month, in progress, and done columns.
- Budget and shopping list generated from inventory gaps and project phases.
- Recommended gear catalog populated from affiliate product data.
- Maintenance and rotation calendar for food, water, batteries, generator tests, radio checks, seeds, garden/livestock cycles, and filters.
- Documents vault for local PDFs/images such as insurance, property docs, medical info, IDs, manuals, maps, radio frequencies, and evacuation plans.
- Communications plan for radio frequencies, call signs, contact trees, rally points, check-ins, message templates, and broadcast stations.
- Evacuation planner for routes, go-bags, vehicle supplies, alternate destinations, fuel stops, animals, and critical documents.
- Skills tracker linked to offline library articles and practice tasks.
- Offline library page for a local ZIM/Kiwix-style reader.

## Local Storage

The app stores plan data in the browser using `localStorage` under:

```text
homestead-ready-plan-v1
```

Use the in-app `Reset` button to clear the local saved plan and return to the default state.

Large document vault files can exceed browser storage limits. For production, consider moving vault files to IndexedDB or a user-controlled local file store.

## Backups and Schema Versioning

Use `Export JSON` to download a portable backup of the full local plan. Use `Import JSON` to restore a backup into the browser.

Plan backups include a `schemaVersion` field. The app currently writes schema version `2` and runs loaded/imported plans through a migration layer before applying them. Future releases should add migrations there instead of breaking existing user plans.

## Affiliate Links

`src/data/affiliateProducts.js` is generated from the emergency preparedness product workbook and includes Amazon affiliate search links. Product links are search-result links, not direct product endorsements. Users should verify seller, specs, reviews, and current pricing before purchasing.

## Development

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run serve
```

## GitHub Release Prep

The repository includes:

- Vite build workflow in `.github/workflows/build.yml`
- Dependabot npm updates in `.github/dependabot.yml`
- `.gitignore` for generated build output, dependencies, logs, and local env files

`dist/` and `node_modules/` are intentionally ignored. Commit source files, `package-lock.json`, and generated product data only if you want the affiliate catalog bundled with the app.

## Contributor Notes

This is an early prototype, but v2 reorganizes the code so contributors do not have to work in one giant application file.

- `src/ui/appShell.js` assembles the app shell from page templates.
- `src/ui/pages/` contains one template module per page.
- `src/data/` contains planning defaults, scenario data, and generated affiliate product data.
- `src/map/` contains OpenLayers layer setup, GeoJSON serialization, and public GIS parcel lookup.
- `src/features/` contains feature-level behavior that can be extracted independently from the main app.
- `src/utils/` contains small shared formatting and date helpers.

`main.js` is still the orchestration layer for shared state and cross-page updates. Good next contributions are to continue moving page behavior into `src/features/`, especially preparedness, shopping, maintenance, documents, communications, evacuation, skills, profiles, and backup/import logic. Keep changes behavior-preserving and run `npm run build` before opening a pull request.

## Notes

Some map/GIS features depend on public external services while online. The planning data itself is stored locally in the browser.

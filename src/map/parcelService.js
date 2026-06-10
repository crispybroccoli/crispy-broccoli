export function createParcelService({
  map,
  parcelSource,
  structureSource,
  readGeoJsonFeatures,
  toLonLat,
  updateParcelStatus,
}) {
  function buildArcGisParcelQuery(rawUrl, lonLat = toLonLat(map.getView().getCenter())) {
    const url = new URL(rawUrl);
    const queryUrl = new URL(`${url.origin}${url.pathname.replace(/\/query\/?$/i, '')}/query`);
    queryUrl.searchParams.set('f', 'geojson');
    queryUrl.searchParams.set('where', '1=1');
    queryUrl.searchParams.set('outFields', '*');
    queryUrl.searchParams.set('returnGeometry', 'true');
    queryUrl.searchParams.set('geometry', `${lonLat[0]},${lonLat[1]}`);
    queryUrl.searchParams.set('geometryType', 'esriGeometryPoint');
    queryUrl.searchParams.set('inSR', '4326');
    queryUrl.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    queryUrl.searchParams.set('outSR', '4326');
    return queryUrl;
  }

  function applyParcelFeatures(features, sourceName = 'public GIS') {
    parcelSource.clear();
    parcelSource.addFeatures(features);
    map.getView().fit(parcelSource.getExtent(), {padding: [60, 60, 60, 60], maxZoom: 24, duration: 500});
    updateParcelStatus(`Loaded property boundary from ${sourceName}.`);
  }

  function getAddressRegion(result) {
    const address = result.address || {};
    return {
      county: address.county || address.city || address.town || address.municipality || '',
      state: address.state || '',
      country: address.country_code || 'us',
    };
  }

  function normalizeCountyName(county) {
    return county.replace(/\s+(County|Parish|Borough|Census Area|Municipality)$/i, '').trim();
  }

  function drawAddressStructure(result) {
    structureSource.clear();
    if (!result.geojson || !['Polygon', 'MultiPolygon'].includes(result.geojson.type)) return false;
    const features = readGeoJsonFeatures({
      type: 'FeatureCollection',
      features: [{type: 'Feature', properties: {source: 'address structure'}, geometry: result.geojson}],
    });
    if (!features.length) return false;
    structureSource.addFeatures(features);
    return true;
  }

  async function searchArcGisParcelServices(region) {
    const county = normalizeCountyName(region.county);
    const state = region.state;
    const queries = [
      `${county} ${state} parcel boundary`,
      `${county} ${state} parcels`,
      `${county} County ${state} parcel`,
      `${county} ${state} cadastral`,
      `${county} ${state} tax parcel`,
      `${county} ${state} assessor parcel`,
    ].filter((query) => query.trim().length > 8);

    const services = [];
    for (const query of queries) {
      const url = new URL('https://www.arcgis.com/sharing/rest/search');
      url.searchParams.set('f', 'json');
      url.searchParams.set('num', '10');
      url.searchParams.set('q', `${query} (parcel OR parcels OR cadastral OR assessor) type:"Feature Service"`);
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      (data.results || []).forEach((item) => {
        if (item.url && !services.some((service) => service.url === item.url)) {
          services.push({url: item.url, title: item.title || query});
        }
      });
      if (services.length >= 12) break;
    }
    return services;
  }

  async function getArcGisParcelLayerUrls(service) {
    const rootUrl = new URL(service.url);
    rootUrl.searchParams.set('f', 'json');
    const response = await fetch(rootUrl);
    if (!response.ok) return [];
    const metadata = await response.json();
    const layers = metadata.layers || [];
    const parcelLayers = layers.filter((layer) => {
      const name = layer.name || '';
      return layer.geometryType === 'esriGeometryPolygon' && /parcel|tax|cadastral|property|lot|assessor|real estate/i.test(name);
    });
    return parcelLayers.slice(0, 4).map((layer) => ({
      url: `${service.url.replace(/\/$/, '')}/${layer.id}`,
      title: `${service.title} - ${layer.name || `Layer ${layer.id}`}`,
    }));
  }

  async function queryArcGisLayerAtPoint(layer, lonLat) {
    const response = await fetch(buildArcGisParcelQuery(layer.url, lonLat));
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.features?.length) return [];
    return readGeoJsonFeatures(data);
  }

  async function autoLoadParcelBoundary(context) {
    if (!context) {
      updateParcelStatus('Search an address first so the app knows where to look.');
      return false;
    }

    updateParcelStatus('Finding tax GIS parcel boundary from the address...');
    parcelSource.clear();
    drawAddressStructure(context.result);

    const services = await searchArcGisParcelServices(context.region);
    if (!services.length) {
      updateParcelStatus('No public parcel GIS service found for this county. Draw the boundary manually for now.');
      return false;
    }

    for (const service of services) {
      const layers = await getArcGisParcelLayerUrls(service);
      for (const layer of layers) {
        const features = await queryArcGisLayerAtPoint(layer, context.lonLat);
        if (features.length) {
          applyParcelFeatures(features, layer.title);
          return true;
        }
      }
    }

    updateParcelStatus('Found public GIS services, but none returned a parcel at this address. Draw the boundary manually for now.');
    return false;
  }

  return {
    autoLoadParcelBoundary,
    drawAddressStructure,
    getAddressRegion,
  };
}

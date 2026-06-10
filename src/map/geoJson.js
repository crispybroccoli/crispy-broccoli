import GeoJSON from 'ol/format/GeoJSON.js';
import {circular} from 'ol/geom/Polygon.js';
import {toLonLat} from 'ol/proj.js';

const featureFormat = new GeoJSON();

export function serializeFeatures(source) {
  const features = source.getFeatures().map((feature) => {
    const clone = feature.clone();
    const geometry = clone.getGeometry();
    if (geometry.getType() === 'Circle') {
      clone.setGeometry(circular(toLonLat(geometry.getCenter()), geometry.getRadius(), 96).transform('EPSG:4326', 'EPSG:3857'));
    }
    return clone;
  });
  return featureFormat.writeFeaturesObject(features, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
}

export function readGeoJsonFeatures(data) {
  return featureFormat.readFeatures(data, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
}

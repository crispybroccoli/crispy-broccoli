import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ.js';
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style.js';

const zoneColors = {
  'no-go': {fill: 'rgba(214,75,52,.26)', stroke: '#d64b34'},
  garden: {fill: 'rgba(75,143,58,.22)', stroke: '#4b8f3a'},
  water: {fill: 'rgba(31,155,180,.23)', stroke: '#1f9bb4'},
  power: {fill: 'rgba(197,138,24,.24)', stroke: '#c58a18'},
  security: {fill: 'rgba(56,78,92,.2)', stroke: '#384e5c'},
  defensible: {fill: 'rgba(208,107,47,.18)', stroke: '#d06b2f'},
};

const zoneLabels = {
  'no-go': 'No-go',
  garden: 'Food',
  water: 'Water',
  power: 'Power',
  security: 'Security',
  defensible: 'Defensible',
};

export function createMapLayers({riskLayerDefinitions}) {
  const streetLayer = new TileLayer({
    source: new OSM(),
    visible: false,
  });

  const satelliteLayer = new TileLayer({
    source: new XYZ({
      attributions: 'Tiles: Esri, Maxar, Earthstar Geographics, and the GIS user community',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
    }),
    visible: true,
  });

  const zoneSource = new VectorSource();
  const markerSource = new VectorSource();
  const parcelSource = new VectorSource();
  const structureSource = new VectorSource();
  const riskSource = new VectorSource();

  const zoneLayer = new VectorLayer({
    source: zoneSource,
    style: (feature) => {
      const zone = feature.get('zone') || 'no-go';
      const color = zoneColors[zone] || zoneColors['no-go'];
      return new Style({
        fill: new Fill({color: color.fill}),
        stroke: new Stroke({color: color.stroke, width: 2}),
        text: new Text({
          text: feature.get('sizeLabel') || zoneLabels[zone] || 'Zone',
          font: '600 12px Inter, system-ui, sans-serif',
          fill: new Fill({color: '#18211f'}),
          stroke: new Stroke({color: 'rgba(255,255,255,.9)', width: 3}),
        }),
      });
    },
  });

  const markerLayer = new VectorLayer({
    source: markerSource,
    style: new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({color: '#d64b34'}),
        stroke: new Stroke({color: '#ffffff', width: 2}),
      }),
    }),
  });

  const parcelLayer = new VectorLayer({
    source: parcelSource,
    style: new Style({
      fill: new Fill({color: 'rgba(214,179,94,.08)'}),
      stroke: new Stroke({color: '#f2c94c', width: 4}),
      text: new Text({
        text: 'Property Boundary',
        font: '800 12px Inter, system-ui, sans-serif',
        fill: new Fill({color: '#17211f'}),
        stroke: new Stroke({color: 'rgba(255,255,255,.95)', width: 4}),
      }),
    }),
  });

  const structureLayer = new VectorLayer({
    source: structureSource,
    style: new Style({
      fill: new Fill({color: 'rgba(31,155,180,.08)'}),
      stroke: new Stroke({color: '#1f9bb4', width: 2, lineDash: [8, 6]}),
      text: new Text({
        text: 'Structure',
        font: '800 11px Inter, system-ui, sans-serif',
        fill: new Fill({color: '#123b43'}),
        stroke: new Stroke({color: 'rgba(255,255,255,.95)', width: 3}),
      }),
    }),
  });

  const riskLayer = new VectorLayer({
    source: riskSource,
    style: (feature) => {
      const risk = riskLayerDefinitions[feature.get('risk')];
      const color = risk?.color || '#66786f';
      return new Style({
        fill: new Fill({color: `${color}26`}),
        stroke: new Stroke({color, width: 2, lineDash: [10, 8]}),
        text: new Text({
          text: risk?.label || 'Risk Layer',
          font: '800 11px Inter, system-ui, sans-serif',
          fill: new Fill({color: '#17211f'}),
          stroke: new Stroke({color: 'rgba(255,255,255,.95)', width: 3}),
        }),
      });
    },
  });

  return {
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
  };
}

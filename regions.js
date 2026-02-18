/**
 * Geographic region definitions for hotspot analysis.
 * Each region has a name, center coordinates, bounds, and population data.
 * Based on a simulated urban area with multiple districts.
 */

const regions = [
  {
    id: 'region-1',
    name: 'Central District',
    center: { lat: 28.6139, lng: 77.2090 },
    bounds: {
      north: 28.6300,
      south: 28.5980,
      east: 77.2250,
      west: 77.1930
    },
    population: 185000,
    hospitals: ['City General Hospital', 'Central Medical Center'],
    waterSources: ['Main Municipal Supply', 'Central Reservoir'],
    historicalRisk: 0.35
  },
  {
    id: 'region-2',
    name: 'North Zone',
    center: { lat: 28.6500, lng: 77.2200 },
    bounds: {
      north: 28.6700,
      south: 28.6300,
      east: 77.2400,
      west: 77.2000
    },
    population: 142000,
    hospitals: ['North District Hospital', 'Community Health Clinic'],
    waterSources: ['North Pipeline', 'Groundwater Wells'],
    historicalRisk: 0.42
  },
  {
    id: 'region-3',
    name: 'South Zone',
    center: { lat: 28.5800, lng: 77.2100 },
    bounds: {
      north: 28.5980,
      south: 28.5600,
      east: 77.2300,
      west: 77.1900
    },
    population: 167000,
    hospitals: ['South Medical Institute', 'Riverside Clinic'],
    waterSources: ['South Treatment Plant', 'River Intake'],
    historicalRisk: 0.28
  },
  {
    id: 'region-4',
    name: 'East Industrial',
    center: { lat: 28.6200, lng: 77.2500 },
    bounds: {
      north: 28.6400,
      south: 28.6000,
      east: 77.2700,
      west: 77.2300
    },
    population: 98000,
    hospitals: ['East Industrial Hospital'],
    waterSources: ['Industrial Water Treatment', 'East Borewell Network'],
    historicalRisk: 0.55
  },
  {
    id: 'region-5',
    name: 'West Residential',
    center: { lat: 28.6100, lng: 77.1700 },
    bounds: {
      north: 28.6300,
      south: 28.5900,
      east: 77.1930,
      west: 77.1500
    },
    population: 210000,
    hospitals: ['West General Hospital', 'Suburban Health Center', 'Patel Clinic'],
    waterSources: ['West Municipal Supply', 'Lake Filtration Plant'],
    historicalRisk: 0.20
  },
  {
    id: 'region-6',
    name: 'Northeast Suburb',
    center: { lat: 28.6600, lng: 77.2500 },
    bounds: {
      north: 28.6800,
      south: 28.6400,
      east: 77.2700,
      west: 77.2300
    },
    population: 76000,
    hospitals: ['Suburban District Hospital'],
    waterSources: ['Suburban Pipeline', 'Open Wells'],
    historicalRisk: 0.48
  },
  {
    id: 'region-7',
    name: 'Southwest Settlement',
    center: { lat: 28.5700, lng: 77.1700 },
    bounds: {
      north: 28.5900,
      south: 28.5500,
      east: 77.1900,
      west: 77.1500
    },
    population: 120000,
    hospitals: ['Settlement Health Post', 'SW Medical College Hospital'],
    waterSources: ['Tanker Supply', 'Community Borewells'],
    historicalRisk: 0.62
  },
  {
    id: 'region-8',
    name: 'Old Town',
    center: { lat: 28.6350, lng: 77.1900 },
    bounds: {
      north: 28.6500,
      south: 28.6200,
      east: 77.2050,
      west: 77.1750
    },
    population: 155000,
    hospitals: ['Heritage Hospital', 'Old Town Clinic'],
    waterSources: ['Old Pipeline Network', 'Heritage Wells'],
    historicalRisk: 0.50
  }
];

module.exports = { regions };

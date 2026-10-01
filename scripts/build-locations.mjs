// Builds src/data/locations.json from the GeoNames dump (CC BY 4.0, https://www.geonames.org).
// Run with: npm run build-locations
import { mkdir, writeFile } from 'node:fs/promises';
import { download, tsvRows, unzipEntry } from './unzip.mjs';

const DUMP = 'https://download.geonames.org/export/dump';
const OUTPUT = new URL('../src/data/locations.json', import.meta.url);

// Feature codes for city districts and places that no longer exist.
const EXCLUDED_FEATURES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);

const [countryInfo, admin1Codes, citiesZip] = await Promise.all([
  download(`${DUMP}/countryInfo.txt`),
  download(`${DUMP}/admin1CodesASCII.txt`),
  download(`${DUMP}/cities15000.zip`),
]);

const countries = new Map();
for (const [iso, , , , name, , , population] of tsvRows(countryInfo.toString('utf8'))) {
  countries.set(iso, { name, population: Number(population) });
}

const regions = new Map();
for (const [code, name] of tsvRows(admin1Codes.toString('utf8'))) regions.set(code, name);

const cities = tsvRows(unzipEntry(citiesZip, 'cities15000.txt'))
  .filter((columns) => !EXCLUDED_FEATURES.has(columns[7]) && countries.has(columns[8]))
  .map((columns) => ({
    name: columns[1],
    country: countries.get(columns[8]).name,
    region: regions.get(`${columns[8]}.${columns[10]}`),
    population: Number(columns[14]),
  }))
  .sort((a, b) => b.population - a.population);

// Add the region only where a city name repeats within a country, e.g. "Springfield, Illinois, United States".
const nameCounts = new Map();
for (const city of cities) {
  const key = `${city.name}|${city.country}`;
  nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
}

const cityLabels = [];
const seen = new Set();
for (const city of cities) {
  const ambiguous = nameCounts.get(`${city.name}|${city.country}`) > 1 && city.region && city.region !== city.name;
  const label = ambiguous ? `${city.name}, ${city.region}, ${city.country}` : `${city.name}, ${city.country}`;
  if (seen.has(label)) continue;
  seen.add(label);
  cityLabels.push(label);
}

const countryLabels = [...countries.values()]
  .filter((country) => country.population > 0)
  .sort((a, b) => b.population - a.population)
  .map((country) => country.name);

await mkdir(new URL('.', OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify([...countryLabels, ...cityLabels]));
console.log(`Wrote ${countryLabels.length} countries and ${cityLabels.length} cities to ${OUTPUT.pathname}`);

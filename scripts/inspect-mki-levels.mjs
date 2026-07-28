import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchHTML(page) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error('No parse data');
  return data.parse.text['*'];
}

const page = process.argv[2] || 'Behemoth_MK_I';
console.log('Fetching', page);
const html = await fetchHTML(page);

// Find levels section
const idx = html.indexOf('Behemoth Mk I Levels');
if (idx === -1) {
  console.log('Levels section not found');
  process.exit(0);
}
const nextH2 = html.indexOf('<h2>', idx + 50);
const section = html.substring(idx, nextH2 !== -1 ? nextH2 : html.length);
console.log('Section length:', section.length);

// Check tabber patterns
console.log('Has tabber:', section.includes('tabber'));
console.log('Has wds-tabber:', section.includes('wds-tabber'));
console.log('Has tabber wds-tabber:', section.includes('tabber wds-tabber'));
console.log('Has center:', section.includes('<center>'));

// Find all table tags
const tableMatches = section.match(/<table/g);
console.log('Tables found:', tableMatches ? tableMatches.length : 0);

// Check first 3000 chars
console.log('--- Section preview ---');
console.log(section.substring(0, 3000));
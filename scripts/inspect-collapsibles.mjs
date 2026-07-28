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

const html = await fetchHTML('Behemoth_MK_I');
const heading = 'Behemoth Mk I Levels';
const idx = html.indexOf(heading);
const nextH2 = html.indexOf('<h2>', idx + 50);
const section = html.substring(idx, nextH2 !== -1 ? nextH2 : html.length);

// Count all mw-customtoggle buttons (which indicate collapsible sections)
const toggleRe = /mw-customtoggle-/g;
let toggleCount = 0;
while (toggleRe.exec(section)) toggleCount++;
console.log('Toggle buttons found:', toggleCount);

// Count mw-collapsible divs
const collapsibleRe = /<div class="mw-collapsible/g;
let collapsibleCount = 0;
while (collapsibleRe.exec(section)) collapsibleCount++;
console.log('mw-collapsible divs:', collapsibleCount);

// Count tables
const tableRe = /<table/g;
let tableCount = 0;
while (tableRe.exec(section)) tableCount++;
console.log('Tables:', tableCount);

// List mw-customtoggle IDs
const toggleIdRe = /mw-customtoggle-(\d+)/g;
const toggleIds = new Set();
let m;
while ((m = toggleIdRe.exec(section))) toggleIds.add(m[1]);
console.log('Toggle IDs:', [...toggleIds]);

// For each toggle ID, find the corresponding collapsible div and check content length
for (const id of toggleIds) {
  const divRe = new RegExp(`<div class="mw-collapsible[^"]*"\\s+id="mw-customcollapsible-${id}">([\\s\\S]*?)</div>\\s*</div>`);
  const dm = section.match(divRe);
  if (dm) {
    const hasTable = /<table/.test(dm[1]);
    console.log(`Toggle ${id}: ${dm[1].length} chars, hasTable: ${hasTable}`);
  } else {
    console.log(`Toggle ${id}: not found`);
  }
}
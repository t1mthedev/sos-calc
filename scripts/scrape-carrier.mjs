import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE = 'FHS_Ark_CV-1_(Carrier)';
const SECTION_LEVELS = 2;

async function fetchSectionHTML(pageName, section) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&section=${section}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageName}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error(`No parse data for ${pageName}`);
  return data.parse.text['*'];
}

function parseCost(s) {
  if (!s || s === '-' || s === '') return 0;
  return parseInt(String(s).replace(/,/g, '').trim(), 10) || 0;
}

function extractTabberTables(html) {
  const tables = [];
  const tabberRe = /<div class="tabber wds-tabber">([\s\S]*?)<\/div>\s*<\/div>\s*<\/center>/g;
  let m;
  while ((m = tabberRe.exec(html)) !== null) {
    const tabContent = m[1];
    const tableRe = /<table[^>]*class="table"[^>]*>([\s\S]*?)<\/table>/g;
    let t;
    while ((t = tableRe.exec(tabContent)) !== null) {
      tables.push(t[1]);
    }
  }
  return tables;
}

function parseLevelTable(tableBody) {
  const rows = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells.push(c[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim());
    }
    // Level data rows have exactly 3 cells (Level | Health/Damage | Specialized Steel).
    if (cells.length !== 3) continue;
    const levelStr = cells[0];
    // Require a plain integer level (skips the summary rows like "1 - 5" / "Total").
    if (!/^\d+$/.test(levelStr)) continue;
    const level = parseInt(levelStr, 10);
    if (level < 1) continue;
    rows.push({
      Level: level,
      Benefit: cells[1],
      SpecializedSteel: parseCost(cells[2]),
    });
  }
  return rows;
}

function extractSummaryTotal(tableBody) {
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  let lastValue = 0;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length === 0) continue;
    const value = parseCost(cells[cells.length - 1]);
    if (value > 0) lastValue = value;
  }
  return lastValue;
}

async function main() {
  console.log(`Fetching ${PAGE} section ${SECTION_LEVELS} (LEVEL STATISTICS & COST)...`);
  const html = await fetchSectionHTML(PAGE, SECTION_LEVELS);

  const tables = extractTabberTables(html);
  console.log(`  ${tables.length} tables found`);

  // The last two tab tables are "Total Per Component" and "Total For All Components".
  const levelTables = tables.slice(0, -2);
  const rows = [];
  for (const table of levelTables) {
    rows.push(...parseLevelTable(table));
  }
  rows.sort((a, b) => a.Level - b.Level);

  console.log(`  ${rows.length} level rows parsed (levels ${rows[0]?.Level ?? '-'}${rows[0] ? '-' + rows[rows.length - 1]?.Level : ''})`);

  const scrapedTotal = rows.reduce((sum, r) => sum + r.SpecializedSteel, 0);
  // The last two tab tables are "Total Per Component" and "Total For All Components".
  const perComponent = tables.length >= 2 ? tables[tables.length - 2] : null;
  const wikiTotal = perComponent ? extractSummaryTotal(perComponent) : 0;
  console.log(`  Scraped Specialized Steel total: ${scrapedTotal}`);
  console.log(`  Wiki 'Total Per Component' total: ${wikiTotal}`);
  if (wikiTotal && scrapedTotal !== wikiTotal) {
    console.warn(`  WARNING: scraper total (${scrapedTotal}) does not match wiki total (${wikiTotal})`);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'FHS Ark CV-1 (Carrier)');
  const dir = join(__dirname, '..', 'src', 'data', 'excel');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const out = join(dir, 'carrier.xlsx');
  XLSX.writeFile(wb, out);
  console.log(`Written to ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
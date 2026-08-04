import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE = 'FA-1_Specter';
const SECTION_LEVELS = 3; // "Aircraft Upgrading: Required Components and Statistics"
const LEVEL_TABLE_COUNT = 5; // Levels 1-20, 21-40, 41-60, 61-100, 101-140

async function fetchSectionHTML(pageName, section) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&section=${section}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageName}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error(`No parse data for ${pageName}`);
  return data.parse.text['*'];
}

function parseCost(s) {
  if (s === undefined || s === null || s === '' || s === '-') return 0;
  return parseInt(String(s).replace(/,/g, '').trim(), 10) || 0;
}

function parsePct(s) {
  if (s === undefined || s === null || s === '' || s === '-') return 0;
  return parseFloat(String(s).replace('%', '').trim()) || 0;
}

// The level tables use bare <table> elements (no class), unlike other wiki pages.
function extractTables(html) {
  const tables = [];
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = tableRe.exec(html)) !== null) tables.push(m[1]);
  return tables;
}

function extractCells(rowHtml) {
  const cells = [];
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let c;
  while ((c = cellRe.exec(rowHtml)) !== null) {
    cells.push(c[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim());
  }
  return cells;
}

function parseLevelTable(tableBody) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = extractCells(m[1]);
    // Each column-group is 4 cells: Level | Health/Lethality | Alloy | Stealth (2 or 3 groups per row).
    for (let i = 0; i + 3 < cells.length; i += 4) {
      const levelStr = cells[i];
      if (!/^\d+$/.test(levelStr)) continue;
      const level = parseInt(levelStr, 10);
      if (level < 1) continue;
      rows.push({
        Level: level,
        'Health/Lethality': parsePct(cells[i + 1]),
        'Advanced Aluminum Alloy': parseCost(cells[i + 2]),
        'Stealth Coating': parseCost(cells[i + 3]),
      });
    }
  }
  return rows;
}

function extractTotalRow(tableBody) {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = extractCells(m[1]);
    if (cells.length >= 3 && /total/i.test(cells[0])) {
      return { alloy: parseCost(cells[cells.length - 2]), stealth: parseCost(cells[cells.length - 1]) };
    }
  }
  return null;
}

async function main() {
  console.log(`Fetching ${PAGE} section ${SECTION_LEVELS} (Aircraft Upgrading)...`);
  const html = await fetchSectionHTML(PAGE, SECTION_LEVELS);

  const tables = extractTables(html);
  console.log(`  ${tables.length} tables found`);

  const levelTables = tables.slice(0, LEVEL_TABLE_COUNT);
  const rows = [];
  for (const table of levelTables) rows.push(...parseLevelTable(table));
  rows.sort((a, b) => a.Level - b.Level);

  console.log(`  ${rows.length} level rows parsed (levels ${rows[0]?.Level ?? '-'}${rows[0] ? '-' + rows[rows.length - 1]?.Level : ''})`);

  const scrapedAlloy = rows.reduce((s, r) => s + r['Advanced Aluminum Alloy'], 0);
  const scrapedStealth = rows.reduce((s, r) => s + r['Stealth Coating'], 0);
  // The last two tables are "Total Per Component" and "Total For All Components".
  const perComponent = tables.length >= 2 ? extractTotalRow(tables[tables.length - 2]) : null;
  if (perComponent) {
    console.log(`  Scraped totals: ${scrapedAlloy} alloy / ${scrapedStealth} stealth`);
    console.log(`  Wiki 'Total Per Component': ${perComponent.alloy} / ${perComponent.stealth}`);
    if (perComponent.alloy !== scrapedAlloy || perComponent.stealth !== scrapedStealth) {
      console.warn('  WARNING: scraper totals do not match wiki totals');
    }
  } else {
    console.log(`  Scraped totals: ${scrapedAlloy} alloy / ${scrapedStealth} stealth`);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'FA-1 Specter');
  const dir = join(__dirname, '..', 'src', 'data', 'excel');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const out = join(dir, 'fa1-specter.xlsx');
  XLSX.writeFile(wb, out);
  console.log(`Written to ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
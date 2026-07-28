import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');

async function fetchHTML(page) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error('No parse data');
  return data.parse.text['*'];
}

function extractAllTables(html, heading, headingId) {
  const searchStr = headingId ? `<span class="mw-headline" id="${headingId}"` : heading;
  const idx = html.indexOf(searchStr);
  if (idx === -1) return [];
  const nextH2 = html.indexOf('<h2>', idx + 50);
  const nextHl = html.indexOf('<span class="mw-headline"', idx + 50);
  let end = html.length;
  if (nextH2 !== -1 && nextHl !== -1) end = Math.min(nextH2, nextHl);
  else if (nextH2 !== -1) end = nextH2;
  else if (nextHl !== -1) end = nextHl;
  const section = html.substring(idx, end);
  const tables = [];
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = tableRe.exec(section)) !== null) {
    tables.push(m[1]);
  }
  return tables;
}

function parseLevelsTable(tableBody, mkLabel) {
  const rows = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim());
    }
    if (cells.length < 4) continue;
    const levelStr = cells[0];
    const level = parseInt(levelStr, 10);
    if (isNaN(level) || level < 1) continue;
    // MK I: Level, Points, Atk/Def, Dmg, HP, Skill, PowerSerum (7 cols)
    // MK II: Level, Points, Atk/Def, Dmg, HP, Skill, ?, Serum (8 cols)
    const pointsRaw = cells[1].replace(/,/g, '').trim();
    const points = parseInt(pointsRaw) || 0;
    const benefitAtk = cells[2] || '';
    const benefitDmg = cells[3] || '';
    const benefitHp = cells[4] || '';
    const costCol = cells.length >= 8 ? 7 : 6;
    const costStr = cells[costCol] || '0';
    const cost = parseInt(costStr.replace(/,/g, '')) || 0;
    // Combine benefit text
    const benefits = [benefitAtk, benefitDmg, benefitHp].filter(Boolean).join(', ');
    rows.push({
      Level: level,
      Mk: mkLabel,
      PowerSerum: cost,
      Benefit: benefits,
      BenefitPct: 0,
      PointsToUpgrade: points,
    });
  }
  return rows;
}

async function main() {
  const mk = process.argv[2] || 'MK I';
  const page = mk === 'MK I' ? 'Behemoth_MK_I' : 'Behemoth_MK_II';
  const heading = mk === 'MK I' ? 'Behemoth Mk I Levels' : 'BEHEMOTH MK II LEVELS';
  console.log(`Fetching ${page}...`);
  const html = await fetchHTML(page);
  const headingId = mk === 'MK I' ? 'Behemoth_Mk_I_Levels' : 'BEHEMOTH_MK_II_LEVELS';
  const tables = extractAllTables(html, heading, headingId);
  console.log(`Found ${tables.length} level tables`);
  if (!tables.length) {
    console.warn('No tables found, exiting');
    process.exit(0);
  }
  // Skip summary tables (last 2), only parse data tables
  const dataTables = tables.slice(0, -2);
  console.log(`Data tables: ${dataTables.length}`);
  const allRows = [];
  for (const table of dataTables) {
    const data = parseLevelsTable(table, mk);
    allRows.push(...data);
  }
  console.log(`Total rows: ${allRows.length}`);

  if (!existsSync(EXCEL_DIR)) mkdirSync(EXCEL_DIR, { recursive: true });

  // Read existing workbook
  const levelsPath = join(EXCEL_DIR, 'behemoth_levels.xlsx');
  let wb;
  if (existsSync(levelsPath)) {
    wb = XLSX.readFile(levelsPath, { cellDates: true });
  } else {
    wb = XLSX.utils.book_new();
  }

  // Remove existing sheet
  if (wb.SheetNames.includes(mk)) {
    const idx = wb.SheetNames.indexOf(mk);
    wb.SheetNames.splice(idx, 1);
    delete wb.Sheets[mk];
  }

  if (allRows.length) {
    const ws = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, ws, mk);
  }

  XLSX.writeFile(wb, levelsPath);
  console.log(`Updated ${levelsPath}`);
}
main().catch(e => { console.error(e); process.exit(1); });
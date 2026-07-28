import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');
const ENHANCE_PATH = join(EXCEL_DIR, 'Behemoth_Enhancements_FINAL.xlsx');

const TIER_NAMES = ['Bane', 'Havoc I', 'Havoc II', 'Scourge I', 'Scourge II', 'Scourge III'];

async function fetchEnhanceHTML() {
  const url = 'https://state-of-survival.fandom.com/api.php?action=parse&page=Companion:%20Behemoth%20Zero&prop=text&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error('No parse data');
  return data.parse.text['*'];
}

function extractSection(html) {
  const idx = html.indexOf('COMPANION ZERO ENHANCEMENTS');
  if (idx === -1) throw new Error('Section not found');
  const nextH2 = html.indexOf('<h2>', idx + 50);
  return html.substring(idx, nextH2 !== -1 ? nextH2 : html.length);
}

function extractTables(section) {
  const tables = [];
  const re = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(section)) !== null) tables.push(m[1]);
  return tables;
}

function parseTableData(tableHtml) {
  const rows = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim());
    }
    if (cells.length < 4) continue;
    const level = cells[0];
    if (!level) continue;
    const benefit = cells[1];
    // Skip header rows (wiki has a second header row that mimics data)
    if (benefit === 'Benefit' || benefit === 'Benefit\nPercentage') continue;
    if (level === 'Level') continue;
    const pctStr = cells[2].replace(/%/g, '').trim();
    const pct = parseFloat(pctStr) / 100;
    const skill = cells[3] === '-' ? '' : cells[3];
    const cost = parseInt((cells[4] || '0').replace(/,/g, '')) || 0;
    const levelNum = parseInt(level);
    const name = isNaN(levelNum) ? (level + '') : String(levelNum);
    rows.push({ level: levelNum, name, benefit, pct, skill, cost });
  }
  return rows;
}

function buildEnhanceRows(tiersData) {
  const rows = [];
  let rowIdx = 1;

  for (let ti = 0; ti < tiersData.length; ti++) {
    const tierName = TIER_NAMES[ti];
    const levels = tiersData[ti];
    // Track cumulative stats for this tier
    const stats = { 'Infantry Lethality': 0, 'Infantry Health': 0, 'Rider Lethality': 0, 'Rider Health': 0, 'Hunter Lethality': 0, 'Hunter Health': 0 };

    for (const lvl of levels) {
      // Update cumulative stat
      if (lvl.benefit && stats[lvl.benefit] !== undefined) {
        stats[lvl.benefit] = lvl.pct;
      }

      const name = `${tierName} ${lvl.name}`;
      const bonusText = lvl.benefit;

      rows.push([
        name,                    // col 0: Level Name
        bonusText,               // col 1: Benefit
        stats['Infantry Lethality'] || '', // col 2
        stats['Infantry Health'] || '',    // col 3
        stats['Rider Lethality'] || '',    // col 4
        stats['Rider Health'] || '',       // col 5
        stats['Hunter Lethality'] || '',   // col 6
        stats['Hunter Health'] || '',      // col 7
        lvl.skill || '',         // col 8: Skill Unlocked
        lvl.cost || '',          // col 9: Enhancement Module cost
      ]);
      rowIdx++;
    }
  }
  return rows;
}

async function main() {
  console.log('Fetching wiki data...');
  const html = await fetchEnhanceHTML();
  const section = extractSection(html);
  const tables = extractTables(section);
  console.log(`Found ${tables.length} tables`);

  // First 6 tables are the enhancement tiers
  const tiersData = [];
  for (let ti = 0; ti < 6; ti++) {
    const data = parseTableData(tables[ti]);
    console.log(`${TIER_NAMES[ti]}: ${data.length} rows (levels ${data[0]?.level || '?'} - ${data[data.length - 1]?.level || '?'})`);
    tiersData.push(data);
  }

  const rows = buildEnhanceRows(tiersData);
  console.log(`Total rows to write: ${rows.length}`);

  // Read existing workbook
  const wb = XLSX.readFile(ENHANCE_PATH, { cellDates: true });
  console.log('Existing sheets:', wb.SheetNames);

  // Check if MK 0 sheet exists
  if (wb.SheetNames.includes('MK 0')) {
    const idx = wb.SheetNames.indexOf('MK 0');
    // Delete old sheet
    wb.SheetNames.splice(idx, 1);
    delete wb.Sheets['MK 0'];
  }

  // Create new sheet
  const header = ['Level', 'Benefit', 'Infantry Lethality', 'Infantry Health', 'Rider Lethality', 'Rider Health', 'Hunter Lethality', 'Hunter Health', 'Skill Unlocked', 'Fragments Required'];
  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 22 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 25 }, { wch: 20 }
  ];

  // Append at the end
  XLSX.utils.book_append_sheet(wb, ws, 'MK 0');

  XLSX.writeFile(wb, ENHANCE_PATH);
  console.log(`Updated ${ENHANCE_PATH}`);
  console.log('Sheets now:', wb.SheetNames);
}

main().catch(e => { console.error(e); process.exit(1); });
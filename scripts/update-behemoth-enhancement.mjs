import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');
const ENHANCE_PATH = join(EXCEL_DIR, 'Behemoth_Enhancements_FINAL.xlsx');

const TIER_NAMES = ['Bane', 'Havoc I', 'Havoc II', 'Scourge I', 'Scourge II', 'Scourge III', 'Cataclysm I', 'Cataclysm II', 'Cataclysm III', 'Abaddon I', 'Abaddon II', 'Abaddon III'];

async function fetchHTML(page) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error('No parse data');
  return data.parse.text['*'];
}

function extractSection(html, heading, headingId) {
  const searchStr = headingId ? `<span class="mw-headline" id="${headingId}"` : heading;
  const idx = html.indexOf(searchStr);
  if (idx === -1) throw new Error(`Section "${heading}" not found`);
  const nextH2 = html.indexOf('<h2>', idx + 50);
  const nextHl = html.indexOf('<span class="mw-headline"', idx + 50);
  let end = html.length;
  if (nextH2 !== -1 && nextHl !== -1) end = Math.min(nextH2, nextHl);
  else if (nextH2 !== -1) end = nextH2;
  else if (nextHl !== -1) end = nextHl;
  return html.substring(idx, end);
}

function parseEnhanceTables(section) {
  const tables = [];
  const re = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(section)) !== null) tables.push(m[1]);
  return tables;
}

function parseTierRows(tableHtml, mkLabel) {
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
    if (level === 'Level' || level === 'Enhancement' || level === 'Statistic') continue;
    const levelNum = parseInt(level);
    const name = isNaN(levelNum) ? level : String(levelNum);
    let totalCost = 0;
    let skill = '';
    if (mkLabel === 'MK II') {
      // MK II: Level, Atk/Def, Dmg, HP, Skill, Fragments
      skill = (cells[4] || '').replace(/^[-–—]+$/, '');
      totalCost = parseInt((cells[5] || '0').replace(/,/g, '')) || 0;
    } else {
      // MK I: Level, Cost1, Cost2, Cost3, Skill, Cost4
      const cost1 = parseInt((cells[1] || '0').replace(/,/g, '')) || 0;
      const cost2 = parseInt((cells[2] || '0').replace(/,/g, '')) || 0;
      const cost3 = parseInt((cells[3] || '0').replace(/,/g, '')) || 0;
      skill = (cells[4] || '').replace(/^[-–—]+$/, '');
      const cost4 = parseInt((cells[5] || '0').replace(/,/g, '')) || 0;
      totalCost = cost1 + cost2 + cost3 + cost4;
    }
    rows.push({ level: levelNum, name, totalCost, skill });
  }
  return rows;
}

function buildExcelRows(tiersData) {
  const rows = [];
  for (let ti = 0; ti < tiersData.length; ti++) {
    const tierName = TIER_NAMES[ti];
    const levels = tiersData[ti];
    for (const lvl of levels) {
      rows.push([
        `${tierName} ${lvl.name}`,
        '',
        '', '', '', '', '', '',
        lvl.skill || '',
        lvl.totalCost || '',
      ]);
    }
  }
  return rows;
}

async function main() {
  const mk = process.argv[2] || 'MK I';
  console.log(`Fetching ${mk} wiki data...`);
  const pageName = mk === 'MK I' ? 'Behemoth_MK_I' : mk === 'MK II' ? 'Behemoth_MK_II' : `Behemoth_MK_${mk.replace(' ', '_')}`;
  const sectionHeading = mk === 'MK I' ? 'Behemoth Mk I Enhancements' : mk === 'MK II' ? 'BEHEMOTH MK II ENHANCEMENTS' : `BEHEMOTH MK ${mk.replace('MK ', '')} ENHANCEMENTS`;
  const headingId = mk === 'MK I' ? 'Behemoth_Mk_I_Enhancements' : mk === 'MK II' ? 'BEHEMOTH_MK_II_ENHANCEMENTS' : `BEHEMOTH_MK_${mk.replace('MK ', '').toUpperCase()}_ENHANCEMENTS`;
  const html = await fetchHTML(pageName);
  const section = extractSection(html, sectionHeading, headingId);
  const tables = parseEnhanceTables(section);
  console.log(`Found ${tables.length} tables`);
  const tiersData = [];
  for (let ti = 0; ti < TIER_NAMES.length && ti < tables.length; ti++) {
    const data = parseTierRows(tables[ti], mk);
    console.log(`${TIER_NAMES[ti]}: ${data.length} rows`);
    tiersData.push(data);
  }
  const rows = buildExcelRows(tiersData);
  console.log(`Total rows to write: ${rows.length}`);
  const wb = XLSX.readFile(ENHANCE_PATH, { cellDates: true });
  if (wb.SheetNames.includes(mk)) {
    const idx = wb.SheetNames.indexOf(mk);
    wb.SheetNames.splice(idx, 1);
    delete wb.Sheets[mk];
  }
  const header = ['Level', 'Benefit', 'Infantry Lethality', 'Infantry Health', 'Rider Lethality', 'Rider Health', 'Hunter Lethality', 'Hunter Health', 'Skill Unlocked', 'Fragments Required'];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, mk);
  XLSX.writeFile(wb, ENHANCE_PATH);
  console.log(`Updated ${ENHANCE_PATH} - ${mk} sheet`);
}
main().catch(e => { console.error(e); process.exit(1); });